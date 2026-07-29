import "server-only"

import { randomUUID } from "node:crypto"
import { Prisma, type PrismaClient } from "@prisma/client"
import {
  GENERAL_REQUEST_TEMPLATES,
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
