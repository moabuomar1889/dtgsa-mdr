import "server-only"
import {
  AuditSeverity,
  DocumentFileType,
  Prisma,
  SystemSeverity,
  TransmittalStatus,
  WorkflowActionType,
  WorkflowStatus,
} from "@prisma/client"
import { z } from "zod"
import { env } from "@/lib/config/env"
import { PERMISSIONS, ROLE_CODES, hasAnyPermission } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import { notifyProjectRoles } from "@/server/services/notifications/notification-service"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

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
    transmittals,
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
