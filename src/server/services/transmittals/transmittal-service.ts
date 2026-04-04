import "server-only"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  AuditSeverity,
  DocumentFileType,
  DriveFolderType,
  GeneratedDocumentKind,
  Prisma,
  StorageProvider,
  SystemSeverity,
  TransmittalStatus,
  WorkflowActionType,
  WorkflowStatus,
} from "@prisma/client"
import { z } from "zod"
import { env } from "@/lib/config/env"
import { convertDocxToPdf } from "@/lib/docx/libreoffice"
import { createTransmittalPdfBuffer } from "@/lib/pdf/toolkit"
import { PERMISSIONS, ROLE_CODES, hasAnyPermission } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import { uploadProjectFileToGoogleDrive } from "@/server/services/drive/project-drive-service"
import { queueAndSendEmailNotification } from "@/server/services/email/email-service"
import { notifyProjectRoles } from "@/server/services/notifications/notification-service"
import {
  buildStoragePath,
  createSignedStorageUrl,
  uploadBytesToSupabaseStorage,
} from "@/server/services/storage/storage-service"
import { renderDocxTemplateFromStorage } from "@/server/services/templates/docx-template-service"
import { findPreferredTransmittalTemplate } from "@/server/services/templates/template-management-service"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>
type TransmittalTemplateContext = {
  id: string
  projectId: string
  transmittalNumber: string
  subject: string
  purpose: string | null
  fromText: string | null
  toText: string | null
  ccText: string | null
  attention: string | null
  messageBody: string | null
  respondByDate: Date | null
  project: {
    code: string
    name: string
    clientId: string
    client: {
      code: string
      name: string
    }
  }
  items: Array<{
    documentRevision: {
      revisionLabel: string
      document: {
        dtgsaDocumentNumber: string
        title: string
      }
    }
  }>
}

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const createTransmittalSchema = z.object({
  projectId: z.string().trim().min(1),
  revisionIds: z.array(z.string().trim().min(1)).min(1),
  subject: z.string().trim().min(3).max(200),
  purpose: z.preprocess(emptyStringToUndefined, z.string().max(200).optional()),
  fromText: z.preprocess(emptyStringToUndefined, z.string().max(200).optional()),
  toText: z.preprocess(emptyStringToUndefined, z.string().max(200).optional()),
  ccText: z.preprocess(emptyStringToUndefined, z.string().max(500).optional()),
  attention: z.preprocess(emptyStringToUndefined, z.string().max(200).optional()),
  messageBody: z.preprocess(emptyStringToUndefined, z.string().max(4000).optional()),
  respondByDate: z.preprocess(
    emptyStringToUndefined,
    z.coerce.date().optional()
  ),
})

const transmittalIdSchema = z.object({
  transmittalId: z.string().trim().min(1),
})

function getProjectRoleCodes(user: CurrentAppUser, projectId: string) {
  return user.projectRoles
    .filter((item) => item.projectId === projectId)
    .map((item) => item.role.code)
}

function assertProjectPermission(
  user: CurrentAppUser,
  projectId: string,
  permission: keyof typeof PERMISSIONS
) {
  const systemRoles = user.userRoles.map((item) => item.role.code)
  const projectRoles = getProjectRoleCodes(user, projectId)

  if (
    !hasAnyPermission({
      required: PERMISSIONS[permission],
      systemRoles,
      projectRoles,
    })
  ) {
    throw new Error("You do not have permission to manage transmittals.")
  }
}

function pickPreferredAttachmentFile(
  files: Array<{
    id: string
    type: DocumentFileType
    fileName: string
    fileSizeBytes: number
  }>
) {
  const priority = [
    DocumentFileType.MERGED,
    DocumentFileType.REVISION_SOURCE,
    DocumentFileType.SOURCE,
    DocumentFileType.PREVIEW,
  ]

  for (const type of priority) {
    const file = files.find((item) => item.type === type)

    if (file) {
      return file
    }
  }

  return files[0] ?? null
}

function resolveTransmittalMaxBytes(input: {
  projectOverrideMb?: number | null
  clientDefaultMb?: number | null
}) {
  const maxMb =
    input.projectOverrideMb ??
    input.clientDefaultMb ??
    env.TRANSMITTAL_MAX_TOTAL_MB

  return maxMb * 1024 * 1024
}

async function buildTransmittalNumber(
  tx: Prisma.TransactionClient,
  project: {
    id: string
    code: string
  }
) {
  const year = new Date().getFullYear()
  const existingCount = await tx.transmittal.count({
    where: {
      projectId: project.id,
      deletedAt: null,
    },
  })

  return `${project.code}-TRM-${year}-${String(existingCount + 1).padStart(3, "0")}`
}

function canManageTransmittals(user: CurrentAppUser) {
  return hasAnyPermission({
    required: PERMISSIONS.transmittalsManage,
    systemRoles: user.userRoles.map((item) => item.role.code),
    projectRoles: user.projectRoles.map((item) => item.role.code),
  })
}

function extractEmailRecipients(...values: Array<string | null | undefined>) {
  const regex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
  const recipients = new Set<string>()

  for (const value of values) {
    if (!value) {
      continue
    }

    for (const match of value.match(regex) ?? []) {
      recipients.add(match.toLowerCase())
    }
  }

  return Array.from(recipients)
}

async function renderTransmittalPdfWithTemplate(input: {
  transmittal: TransmittalTemplateContext | null
}) {
  const transmittal = input.transmittal

  if (!transmittal) {
    return null
  }

  const template = await findPreferredTransmittalTemplate({
    clientId: transmittal.project.clientId,
    projectId: transmittal.projectId,
  })

  if (!template) {
    return null
  }

  const tempDir = await mkdtemp(join(tmpdir(), "dtgsa-transmittal-"))

  try {
    const docxBuffer = await renderDocxTemplateFromStorage(template, {
      transmittal_number: transmittal.transmittalNumber,
      project_title: transmittal.project.name,
      project_code: transmittal.project.code,
      client_name: transmittal.project.client.name,
      client_code: transmittal.project.client.code,
      subject: transmittal.subject,
      purpose: transmittal.purpose ?? "",
      from_text: transmittal.fromText ?? "",
      to_text: transmittal.toText ?? "",
      cc_text: transmittal.ccText ?? "",
      attention: transmittal.attention ?? "",
      respond_by_date:
        transmittal.respondByDate?.toLocaleDateString("en-GB") ?? "",
      message_body: transmittal.messageBody ?? "",
      items: transmittal.items.map((item) => ({
        document_number: item.documentRevision.document.dtgsaDocumentNumber,
        revision_label: item.documentRevision.revisionLabel,
        title: item.documentRevision.document.title,
      })),
    })
    const inputPath = join(tempDir, "transmittal.docx")
    await writeFile(inputPath, docxBuffer)
    const outputPath = await convertDocxToPdf(inputPath, tempDir)
    return await readFile(outputPath)
  } catch (error) {
    await prisma.systemLog.create({
      data: {
        source: "transmittals",
        action: "template.render_failed",
        message:
          error instanceof Error
            ? error.message
            : "Unknown transmittal template rendering failure.",
        entityType: "Transmittal",
        entityId: transmittal.id,
        projectId: transmittal.projectId,
        clientId: transmittal.project.clientId,
        severity: SystemSeverity.Warning,
      },
    })

    return null
  } finally {
    await rm(tempDir, {
      recursive: true,
      force: true,
    }).catch(() => undefined)
  }
}

export async function getTransmittalOverview(user: CurrentAppUser) {
  if (!canManageTransmittals(user)) {
    throw new Error("You do not have permission to view transmittals.")
  }

  const [projects, eligibleRevisions, transmittals] = await Promise.all([
    prisma.project.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [{ code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        client: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    }),
    prisma.documentRevision.findMany({
      where: {
        deletedAt: null,
        isCurrent: true,
        workflowStatus: WorkflowStatus.ReadyToSubmit,
        document: {
          deletedAt: null,
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        document: {
          select: {
            id: true,
            title: true,
            dtgsaDocumentNumber: true,
            clientDocumentNumber: true,
            projectId: true,
            project: {
              select: {
                id: true,
                code: true,
                name: true,
                client: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        files: {
          where: {
            deletedAt: null,
          },
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            type: true,
            fileName: true,
            fileSizeBytes: true,
          },
        },
      },
    }),
    prisma.transmittal.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        project: {
          select: {
            id: true,
            code: true,
            name: true,
            client: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        items: {
          orderBy: [{ itemOrder: "asc" }],
          include: {
            documentRevision: {
              include: {
                document: {
                  select: {
                    title: true,
                    dtgsaDocumentNumber: true,
                  },
                },
              },
            },
          },
        },
        generatedDocuments: {
          where: {
            kind: GeneratedDocumentKind.TRANSMITTAL_PDF,
          },
          orderBy: [{ createdAt: "desc" }],
          take: 1,
        },
      },
    }),
  ])

  const mappedEligibleRevisions = eligibleRevisions.map((revision) => {
    const preferredFile = pickPreferredAttachmentFile(revision.files)

    return {
      id: revision.id,
      revisionLabel: revision.revisionLabel,
      projectId: revision.document.projectId,
      documentId: revision.document.id,
      title: revision.document.title,
      dtgsaDocumentNumber: revision.document.dtgsaDocumentNumber,
      clientDocumentNumber: revision.document.clientDocumentNumber,
      attachmentFileName: preferredFile?.fileName ?? null,
      attachmentFileId: preferredFile?.id ?? null,
      attachmentFileSizeBytes: preferredFile?.fileSizeBytes ?? 0,
      project: revision.document.project,
    }
  })

  return {
    projects,
    eligibleRevisions: mappedEligibleRevisions,
    transmittals: await Promise.all(
      transmittals.map(async (transmittal) => ({
        ...transmittal,
        generatedPdfUrl:
          transmittal.generatedDocuments[0]?.storageBucket &&
          transmittal.generatedDocuments[0]?.storagePath
            ? await createSignedStorageUrl(
                transmittal.generatedDocuments[0].storageBucket,
                transmittal.generatedDocuments[0].storagePath
              ).catch(() => null)
            : transmittal.generatedDocuments[0]?.googleDriveFileId
              ? `https://drive.google.com/file/d/${transmittal.generatedDocuments[0].googleDriveFileId}/view`
              : null,
      }))
    ),
    counts: {
      total: transmittals.length,
      readyToSend: transmittals.filter(
        (item) => item.status === TransmittalStatus.ReadyToSend
      ).length,
      sent: transmittals.filter((item) => item.status === TransmittalStatus.Sent)
        .length,
      eligibleDocuments: mappedEligibleRevisions.length,
    },
  }
}

export async function createTransmittal(
  actor: CurrentAppUser,
  input: unknown
) {
  const parsed = createTransmittalSchema.parse(input)
  const revisionIds = Array.from(new Set(parsed.revisionIds))

  const project = await prisma.project.findUnique({
    where: {
      id: parsed.projectId,
    },
    include: {
      client: {
        include: {
          setting: true,
        },
      },
      setting: true,
    },
  })

  if (!project || project.deletedAt) {
    throw new Error("The selected project could not be found.")
  }

  assertProjectPermission(actor, project.id, "transmittalsManage")

  const revisions = await prisma.documentRevision.findMany({
    where: {
      id: {
        in: revisionIds,
      },
      deletedAt: null,
      isCurrent: true,
    },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          projectId: true,
          deletedAt: true,
        },
      },
      files: {
        where: {
          deletedAt: null,
        },
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          type: true,
          fileName: true,
          fileSizeBytes: true,
        },
      },
    },
  })

  if (revisions.length !== revisionIds.length) {
    throw new Error("One or more selected revisions could not be found.")
  }

  for (const revision of revisions) {
    if (revision.document.projectId !== project.id) {
      throw new Error("All selected revisions must belong to the same project.")
    }

    if (revision.workflowStatus !== WorkflowStatus.ReadyToSubmit) {
      throw new Error(
        "Only revisions in ReadyToSubmit status can be added to a transmittal."
      )
    }
  }

  const existingDraftLinks = await prisma.transmittalItem.findMany({
    where: {
      documentRevisionId: {
        in: revisionIds,
      },
      transmittal: {
        deletedAt: null,
        status: {
          in: [TransmittalStatus.Draft, TransmittalStatus.ReadyToSend],
        },
      },
    },
    include: {
      transmittal: {
        select: {
          transmittalNumber: true,
        },
      },
    },
  })

  if (existingDraftLinks.length > 0) {
    throw new Error(
      `One or more revisions are already reserved in transmittal ${existingDraftLinks[0].transmittal.transmittalNumber}.`
    )
  }

  const attachments = revisions.map((revision) => ({
    revision,
    file: pickPreferredAttachmentFile(revision.files),
  }))

  const totalAttachmentBytes = attachments.reduce(
    (sum, item) => sum + (item.file?.fileSizeBytes ?? 0),
    0
  )

  const maxAttachmentBytes = resolveTransmittalMaxBytes({
    projectOverrideMb: project.setting?.transmittalMaxTotalMbOverride,
    clientDefaultMb: project.client.setting?.defaultTransmittalMaxMb,
  })

  if (totalAttachmentBytes > maxAttachmentBytes) {
    throw new Error(
      "The selected attachments exceed the configured transmittal size limit."
    )
  }

  return prisma.$transaction(async (tx) => {
    const transmittalNumber = await buildTransmittalNumber(tx, project)

    const created = await tx.transmittal.create({
      data: {
        projectId: project.id,
        transmittalNumber,
        subject: parsed.subject.trim(),
        purpose: parsed.purpose?.trim() || null,
        fromText: parsed.fromText?.trim() || null,
        toText: parsed.toText?.trim() || null,
        ccText: parsed.ccText?.trim() || null,
        attention: parsed.attention?.trim() || null,
        messageBody: parsed.messageBody?.trim() || null,
        respondByDate: parsed.respondByDate ?? null,
        totalAttachmentBytes,
        status: TransmittalStatus.ReadyToSend,
        createdByUserId: actor.id,
      },
    })

    await tx.transmittalItem.createMany({
      data: attachments.map((item, index) => ({
        transmittalId: created.id,
        documentRevisionId: item.revision.id,
        documentFileId: item.file?.id ?? null,
        itemOrder: index + 1,
      })),
    })

    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "transmittal.create",
        entityType: "Transmittal",
        entityId: created.id,
        projectId: project.id,
        clientId: project.clientId,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          transmittalNumber,
          itemCount: attachments.length,
          totalAttachmentBytes,
          revisionIds,
        },
      },
    })

    return created
  })
}

export async function sendTransmittal(actor: CurrentAppUser, input: unknown) {
  const parsed = transmittalIdSchema.parse(input)

  const transmittal = await prisma.transmittal.findUnique({
    where: {
      id: parsed.transmittalId,
    },
    include: {
      project: {
        select: {
          id: true,
          code: true,
          name: true,
          clientId: true,
          client: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
      items: {
        include: {
          documentRevision: {
            include: {
              document: {
                select: {
                  id: true,
                  title: true,
                  dtgsaDocumentNumber: true,
                },
              },
            },
          },
        },
        orderBy: [{ itemOrder: "asc" }],
      },
    },
  })

  if (!transmittal || transmittal.deletedAt) {
    throw new Error("The selected transmittal could not be found.")
  }

  assertProjectPermission(actor, transmittal.projectId, "transmittalsManage")

  if (transmittal.status === TransmittalStatus.Sent) {
    throw new Error("This transmittal has already been sent.")
  }

  if (transmittal.items.length === 0) {
    throw new Error("A transmittal cannot be sent without attached revisions.")
  }

  const sentAt = new Date()
  const fallbackTransmittalPdf = createTransmittalPdfBuffer({
    transmittalNumber: transmittal.transmittalNumber,
    subject: transmittal.subject,
    projectName: transmittal.project.name,
    projectCode: transmittal.project.code,
    fromText: transmittal.fromText,
    toText: transmittal.toText,
    attention: transmittal.attention,
    messageBody: transmittal.messageBody,
    items: transmittal.items.map((item) => ({
      documentNumber: item.documentRevision.document.dtgsaDocumentNumber,
      revisionLabel: item.documentRevision.revisionLabel,
      title: item.documentRevision.document.title,
    })),
  })
  const transmittalPdfBuffer =
    (await renderTransmittalPdfWithTemplate({ transmittal })) ??
    (await fallbackTransmittalPdf)
  const transmittalPdfUpload = await uploadBytesToSupabaseStorage({
    bucket: env.SUPABASE_STORAGE_BUCKET_GENERATED,
    path: buildStoragePath(
      "projects",
      transmittal.project.code,
      "transmittals",
      transmittal.transmittalNumber,
      "transmittal.pdf"
    ),
    bytes: transmittalPdfBuffer,
    fileName: `${transmittal.transmittalNumber}.pdf`,
    mimeType: "application/pdf",
    upsert: true,
  })
  const transmittalDriveUpload = await uploadProjectFileToGoogleDrive({
    projectId: transmittal.projectId,
    folderType: DriveFolderType.TRANSMITTALS,
    fileName: transmittalPdfUpload.fileName,
    bytes: transmittalPdfBuffer,
    mimeType: transmittalPdfUpload.mimeType,
    actorUserId: actor.id,
  })
  const transmittalPdfUrl = await createSignedStorageUrl(
    transmittalPdfUpload.bucket,
    transmittalPdfUpload.path,
    60 * 60 * 24 * 7
  ).catch(() => null)

  await prisma.$transaction(async (tx) => {
    await tx.transmittal.update({
      where: {
        id: transmittal.id,
      },
      data: {
        status: TransmittalStatus.Sent,
        sentAt,
      },
    })

    for (const item of transmittal.items) {
      await tx.documentRevision.update({
        where: {
          id: item.documentRevisionId,
        },
        data: {
          workflowStatus: WorkflowStatus.SubmittedToClient,
          submittedToClientAt: sentAt,
        },
      })

      await tx.mdrDocument.update({
        where: {
          id: item.documentRevision.documentId,
        },
        data: {
          currentWorkflowStatus: WorkflowStatus.SubmittedToClient,
        },
      })

      await tx.workflowAction.create({
        data: {
          documentRevisionId: item.documentRevisionId,
          actionType: WorkflowActionType.SubmittedToClient,
          actorUserId: actor.id,
          fromStatus: item.documentRevision.workflowStatus,
          toStatus: WorkflowStatus.SubmittedToClient,
          comments: `Submitted through transmittal ${transmittal.transmittalNumber}.`,
          metadata: {
            transmittalId: transmittal.id,
            transmittalNumber: transmittal.transmittalNumber,
          },
        },
      })
    }

    await tx.generatedDocument.create({
      data: {
        transmittalId: transmittal.id,
        kind: GeneratedDocumentKind.TRANSMITTAL_PDF,
        fileName: transmittalPdfUpload.fileName,
        storageProvider: StorageProvider.Supabase,
        storageBucket: transmittalPdfUpload.bucket,
        storagePath: transmittalPdfUpload.path,
        googleDriveFileId: transmittalDriveUpload?.fileId ?? null,
        generatedByUserId: actor.id,
      },
    })

    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "transmittal.send",
        entityType: "Transmittal",
        entityId: transmittal.id,
        projectId: transmittal.projectId,
        clientId: transmittal.project.clientId,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          sentAt: sentAt.toISOString(),
          transmittalNumber: transmittal.transmittalNumber,
          itemCount: transmittal.items.length,
        },
      },
    })

    if (!env.EMAIL_PROVIDER) {
      await tx.systemLog.create({
        data: {
          actorUserId: actor.id,
          source: "transmittals",
          action: "email.skipped",
          message:
            "Transmittal was marked as sent, but no email provider is configured yet.",
          entityType: "Transmittal",
          entityId: transmittal.id,
          projectId: transmittal.projectId,
          clientId: transmittal.project.clientId,
          severity: SystemSeverity.Warning,
          metadata: {
            transmittalNumber: transmittal.transmittalNumber,
          },
        },
      })
    }
  })

  const emailRecipients = extractEmailRecipients(
    transmittal.toText,
    transmittal.ccText
  )

  if (env.EMAIL_PROVIDER && emailRecipients.length > 0) {
    await queueAndSendEmailNotification({
      to: emailRecipients,
      subject: `Transmittal ${transmittal.transmittalNumber}: ${transmittal.subject}`,
      text: [
        `Project: ${transmittal.project.code} - ${transmittal.project.name}`,
        `Transmittal: ${transmittal.transmittalNumber}`,
        transmittal.messageBody ? `Message: ${transmittal.messageBody}` : null,
        transmittalPdfUrl ? `PDF: ${transmittalPdfUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <p><strong>Project:</strong> ${transmittal.project.code} - ${transmittal.project.name}</p>
        <p><strong>Transmittal:</strong> ${transmittal.transmittalNumber}</p>
        <p><strong>Subject:</strong> ${transmittal.subject}</p>
        ${transmittal.messageBody ? `<p>${transmittal.messageBody}</p>` : ""}
        ${transmittalPdfUrl ? `<p><a href="${transmittalPdfUrl}">Open transmittal PDF</a></p>` : ""}
      `,
      projectId: transmittal.projectId,
      clientId: transmittal.project.clientId,
      actorUserId: actor.id,
    }).catch(async (error) => {
      await prisma.systemLog.create({
        data: {
          actorUserId: actor.id,
          source: "transmittals",
          action: "email.failed",
          message:
            error instanceof Error
              ? error.message
              : "Unknown transmittal email delivery failure.",
          entityType: "Transmittal",
          entityId: transmittal.id,
          projectId: transmittal.projectId,
          clientId: transmittal.project.clientId,
          severity: SystemSeverity.Warning,
          metadata: {
            transmittalNumber: transmittal.transmittalNumber,
            recipients: emailRecipients,
          },
        },
      })
    })
  } else if (env.EMAIL_PROVIDER && emailRecipients.length === 0) {
    await prisma.systemLog.create({
      data: {
        actorUserId: actor.id,
        source: "transmittals",
        action: "email.skipped",
        message:
          "Transmittal email delivery was requested, but no valid recipient email addresses were found in To/CC.",
        entityType: "Transmittal",
        entityId: transmittal.id,
        projectId: transmittal.projectId,
        clientId: transmittal.project.clientId,
        severity: SystemSeverity.Warning,
        metadata: {
          transmittalNumber: transmittal.transmittalNumber,
          toText: transmittal.toText,
          ccText: transmittal.ccText,
        },
      },
    })
  }

  await notifyProjectRoles({
    projectId: transmittal.projectId,
    clientId: transmittal.project.clientId,
    roleCodes: [
      ROLE_CODES.documentControlAdmin,
      ROLE_CODES.documentControlUser,
      ROLE_CODES.disciplineUser,
      ROLE_CODES.reviewer,
      ROLE_CODES.approver,
    ],
    excludeUserIds: [actor.id],
    title: `Transmittal ${transmittal.transmittalNumber} sent`,
    body: `${transmittal.items.length} document revision(s) for ${transmittal.project.code} were submitted to the client.`,
    actionUrl: "/transmittals",
    metadata: {
      transmittalId: transmittal.id,
      transmittalNumber: transmittal.transmittalNumber,
    },
    requestEmailDelivery: true,
  })
}
