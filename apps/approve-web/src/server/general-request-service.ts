import "server-only"

import { randomUUID } from "node:crypto"
import { Prisma, type PrismaClient } from "@prisma/client"
import {
  GENERAL_REQUEST_TEMPLATES,
  canonicalRequestHash,
  validateFormDefinition,
  validateFormSubmission,
  type SafeField,
} from "@dtg/integration-domain"

export async function ensureGeneralRequestTemplates(prisma: PrismaClient) {
  for (const template of GENERAL_REQUEST_TEMPLATES) {
    const requestType = await prisma.generalRequestType.upsert({
      where: { code: template.code },
      create: {
        code: template.code,
        name: template.name,
        departmentOwner: template.departmentOwner,
      },
      update: {},
    })
    const existing = await prisma.generalRequestTypeVersion.findUnique({
      where: {
        requestTypeId_version: {
          requestTypeId: requestType.id,
          version: 1,
        },
      },
    })
    if (!existing) {
      validateFormDefinition(template.fields)
      await prisma.generalRequestTypeVersion.create({
        data: {
          requestTypeId: requestType.id,
          version: 1,
          status: "Published",
          formDefinition: template.fields as Prisma.InputJsonValue,
          publishedAt: new Date(),
        },
      })
    }
  }
}

export async function getGeneralRequestWorkspace(
  prisma: PrismaClient,
  input: { search?: string; status?: string }
) {
  await ensureGeneralRequestTemplates(prisma)
  const [types, requests] = await Promise.all([
    prisma.generalRequestType.findMany({
      orderBy: [{ departmentOwner: "asc" }, { name: "asc" }],
    }),
    prisma.generalRequest.findMany({
      where: {
        status: input.status || undefined,
        OR: input.search
          ? [
              {
                requestNumber: {
                  contains: input.search,
                  mode: "insensitive",
                },
              },
              { purpose: { contains: input.search, mode: "insensitive" } },
              {
                sourceRecordId: {
                  contains: input.search,
                  mode: "insensitive",
                },
              },
            ]
          : undefined,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        approvalCase: {
          include: { steps: { orderBy: { stepOrder: "asc" } } },
        },
      },
    }),
  ])
  const versions = await prisma.generalRequestTypeVersion.findMany({
    where: {
      requestTypeId: { in: types.map((type) => type.id) },
      status: "Published",
    },
    orderBy: { version: "desc" },
  })
  return {
    types: types.map((type) => ({
      ...type,
      version: versions.find((version) => version.requestTypeId === type.id),
    })),
    requests,
  }
}

export async function submitGeneralRequest(
  prisma: PrismaClient,
  input: {
    requestTypeVersionId: string
    sourceSystem: string
    sourceRecordId: string
    purpose: string
    classification: string
    projectId?: string
    clientId?: string
    submittedByUserId: string
    formData: Record<string, unknown>
    attachmentFileObjectIds?: string[]
    correlationId?: string
  }
) {
  const version = await prisma.generalRequestTypeVersion.findUnique({
    where: { id: input.requestTypeVersionId },
  })
  if (!version || version.status !== "Published") {
    throw new Error("A published request type version is required.")
  }
  const requestType = await prisma.generalRequestType.findUnique({
    where: { id: version.requestTypeId },
  })
  if (!requestType) throw new Error("The request type is unavailable.")
  validateFormSubmission(version.formDefinition as SafeField[], input.formData)
  const requestNumber = `GR-${new Date().getUTCFullYear()}-${randomUUID()
    .replaceAll("-", "")
    .slice(0, 10)
    .toUpperCase()}`
  return prisma.$transaction(async (tx) => {
    const request = await tx.generalRequest.create({
      data: {
        requestTypeVersionId: version.id,
        requestNumber,
        sourceSystem: input.sourceSystem || "APPROVE_WEB",
        sourceEntityType: "GENERAL_REQUEST",
        sourceRecordId: input.sourceRecordId || requestNumber,
        purpose: input.purpose,
        classification: input.classification,
        projectId: input.projectId,
        clientId: input.clientId,
        submittedByUserId: input.submittedByUserId,
        formData: input.formData as Prisma.InputJsonValue,
        status: "Submitted",
        approvalCase: {
          create: {
            packageHash: canonicalRequestHash({
              requestNumber,
              requestTypeVersionId: version.id,
              formData: input.formData,
              purpose: input.purpose,
              classification: input.classification,
            }),
            workflowSnapshot: {
              requestTypeVersionId: version.id,
              workflowTemplateId: version.workflowTemplateId,
              departmentOwner: requestType.departmentOwner,
              steps: ["DEPARTMENT_APPROVAL"],
            },
            steps: {
              create: {
                stepKey: "DEPARTMENT_APPROVAL",
                label: `${requestType.departmentOwner} approval`,
                requiredRole: requestType.departmentOwner,
                stepOrder: 1,
              },
            },
          },
        },
        attachments: input.attachmentFileObjectIds?.length
          ? {
              create: [...new Set(input.attachmentFileObjectIds)].map(
                (fileObjectId) => ({ fileObjectId })
              ),
            }
          : undefined,
      },
    })
    await tx.backgroundJob.create({
      data: {
        jobType: "GENERAL_REQUEST_SUMMARY",
        payload: { generalRequestId: request.id },
        idempotencyKey: `general-request-summary:${request.id}`,
        correlationId: input.correlationId,
      },
    })
    await tx.outboxEvent.create({
      data: {
        eventType: "CASE_STARTED",
        aggregateType: "GeneralRequest",
        aggregateId: request.id,
        correlationId: input.correlationId,
        payload: {
          requestNumber,
          sourceSystem: request.sourceSystem,
          sourceRecordId: request.sourceRecordId,
        },
      },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: input.submittedByUserId,
        action: "general_request.submitted",
        entityType: "GeneralRequest",
        entityId: request.id,
        projectId: request.projectId,
        clientId: request.clientId,
        correlationId: input.correlationId,
        afterSnapshot: {
          requestNumber,
          requestTypeVersionId: version.id,
          classification: request.classification,
        },
      },
    })
    return request
  })
}

export async function decideGeneralRequest(
  prisma: PrismaClient,
  input: {
    generalRequestId: string
    actor: {
      id: string
      fullName: string
      email: string
      jobTitle: string | null
      employeeCode: string | null
      departmentId: string | null
      systemRoles: string[]
      projectRoles: Array<{ projectId: string }>
    }
    decision: "APPROVE" | "RETURN" | "REJECT"
    comments?: string
    declarationAccepted: boolean
    idempotencyKey: string
  }
) {
  if (!input.declarationAccepted) {
    throw new Error("The approval responsibility declaration is required.")
  }
  const existing = await prisma.generalRequestApprovalDecision.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  })
  if (existing) return existing
  const request = await prisma.generalRequest.findUnique({
    where: { id: input.generalRequestId },
    include: {
      approvalCase: { include: { steps: { orderBy: { stepOrder: "asc" } } } },
    },
  })
  if (
    !request?.approvalCase ||
    request.approvalCase.status !== "Active" ||
    !request.summaryFileObjectId
  ) {
    throw new Error(
      "The request summary and active approval case are required."
    )
  }
  const version = await prisma.generalRequestTypeVersion.findUnique({
    where: { id: request.requestTypeVersionId },
  })
  const requestType = version
    ? await prisma.generalRequestType.findUnique({
        where: { id: version.requestTypeId },
      })
    : null
  const department = requestType
    ? await prisma.department.findFirst({
        where: {
          OR: [
            { code: requestType.departmentOwner },
            { name: requestType.departmentOwner },
          ],
          isActive: true,
        },
      })
    : null
  const authorized =
    input.actor.systemRoles.some((role) =>
      ["super_admin", "system_admin", "document_control_admin"].includes(role)
    ) ||
    (request.projectId &&
      input.actor.projectRoles.some(
        (role) => role.projectId === request.projectId
      )) ||
    (department && input.actor.departmentId === department.id)
  if (!authorized) throw new Error("General request approval is not assigned.")
  const step = request.approvalCase.steps.find(
    (candidate) => candidate.status === "Active"
  )
  if (!step) throw new Error("No active request approval step exists.")
  const summary = await prisma.fileObject.findUnique({
    where: { id: request.summaryFileObjectId },
  })
  if (!summary) throw new Error("The request summary evidence is unavailable.")
  const declarationHash = canonicalRequestHash({
    declaration: "general-request-approval-responsibility-v1",
  })
  const evidenceHash = canonicalRequestHash({
    packageHash: request.approvalCase.packageHash,
    summaryHash: summary.checksum,
    stepId: step.id,
    actorUserId: input.actor.id,
    decision: input.decision,
  })
  return prisma.$transaction(async (tx) => {
    const decision = await tx.generalRequestApprovalDecision.create({
      data: {
        stepId: step.id,
        actorUserId: input.actor.id,
        decision: input.decision,
        comments: input.comments,
        declarationHash,
        evidenceHash,
        idempotencyKey: input.idempotencyKey,
        identitySnapshot: {
          fullName: input.actor.fullName,
          email: input.actor.email,
          jobTitle: input.actor.jobTitle,
          employeeCode: input.actor.employeeCode,
        },
      },
    })
    const completedAt = new Date()
    await tx.generalRequestApprovalStep.update({
      where: { id: step.id },
      data: { status: "Completed", completedAt },
    })
    await tx.generalRequestApprovalCase.update({
      where: { id: request.approvalCase!.id },
      data: {
        status:
          input.decision === "APPROVE"
            ? "Completed"
            : input.decision === "REJECT"
              ? "Rejected"
              : "Returned",
        completedAt,
      },
    })
    const status =
      input.decision === "APPROVE"
        ? "Completed"
        : input.decision === "REJECT"
          ? "Rejected"
          : "Returned"
    await tx.generalRequest.update({
      where: { id: request.id },
      data: { status },
    })
    await tx.outboxEvent.create({
      data: {
        eventType:
          input.decision === "APPROVE"
            ? "INTERNAL_APPROVAL_COMPLETED"
            : input.decision === "REJECT"
              ? "CASE_REJECTED"
              : "CASE_RETURNED",
        aggregateType: "GeneralRequest",
        aggregateId: request.id,
        payload: { decisionId: decision.id, evidenceHash },
      },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: input.actor.id,
        action: "general_request.decision.recorded",
        entityType: "GeneralRequestApprovalDecision",
        entityId: decision.id,
        projectId: request.projectId,
        clientId: request.clientId,
        relevantHashes: {
          packageHash: request.approvalCase!.packageHash,
          summaryHash: summary.checksum,
          evidenceHash,
        },
        afterSnapshot: { status, generalRequestId: request.id },
      },
    })
    return decision
  })
}

export async function createRequestTypeVersion(
  prisma: PrismaClient,
  input: {
    code: string
    name: string
    departmentOwner: string
    fields: SafeField[]
    workflowTemplateId?: string
    publish: boolean
  }
) {
  validateFormDefinition(input.fields)
  return prisma.$transaction(async (tx) => {
    const requestType = await tx.generalRequestType.upsert({
      where: { code: input.code },
      create: {
        code: input.code,
        name: input.name,
        departmentOwner: input.departmentOwner,
      },
      update: {
        name: input.name,
        departmentOwner: input.departmentOwner,
      },
    })
    const latest = await tx.generalRequestTypeVersion.findFirst({
      where: { requestTypeId: requestType.id },
      orderBy: { version: "desc" },
    })
    return tx.generalRequestTypeVersion.create({
      data: {
        requestTypeId: requestType.id,
        version: (latest?.version ?? 0) + 1,
        status: input.publish ? "Published" : "Draft",
        formDefinition: input.fields as Prisma.InputJsonValue,
        workflowTemplateId: input.workflowTemplateId,
        publishedAt: input.publish ? new Date() : undefined,
      },
    })
  })
}
