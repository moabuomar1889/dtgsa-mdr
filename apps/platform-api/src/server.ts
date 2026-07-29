import { randomUUID } from "node:crypto"
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http"
import { loadFoundationConfiguration } from "@dtg/configuration"
import { Prisma } from "@prisma/client"
import { createHealthResponse, createReadinessResponse } from "@dtg/contracts"
import { createPrismaClient, type PrismaClient } from "@dtg/database"
import {
  API_RESOURCES,
  assertWebhookUrl,
  assertIdempotent,
  assertResourceAccess,
  assertScope,
  canonicalRequestHash,
  IntegrationError,
  issueClientSecret,
  encryptWebhookSecret,
  parseBearerCredential,
  publicIntegrationRecord,
  validateFormSubmission,
  verifySecret,
  type ApiScope,
  type SafeField,
  WEBHOOK_EVENTS,
} from "@dtg/integration-domain"
import { writeLog } from "@dtg/observability"

export const apiConfiguration = loadFoundationConfiguration(
  "platform-api",
  process.env,
  3003
)

const resourceScopes: Record<string, ApiScope> = {
  documents: "documents:read",
  revisions: "documents:read",
  "approval-cases": "cases:read",
  "approval-steps": "cases:read",
  "review-sessions": "cases:read",
  comments: "comments:write",
  "client-submissions": "cases:read",
  "client-responses": "responses:write",
  downloads: "downloads:read",
  verification: "verification:read",
  "general-requests": "requests:read",
  integrations: "integrations:manage",
  webhooks: "webhooks:manage",
}

const mutationScopes: Partial<Record<string, ApiScope>> = {
  "approval-cases": "cases:write",
  comments: "comments:write",
  "client-responses": "responses:write",
  verification: "verification:read",
  "general-requests": "requests:write",
  integrations: "integrations:manage",
  webhooks: "webhooks:manage",
}

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "DTG Signature Platform Integration API",
    version: "1.0.0",
  },
  servers: [{ url: "/api/v1" }],
  security: [{ serviceClient: [] }],
  components: {
    securitySchemes: {
      serviceClient: {
        type: "http",
        scheme: "bearer",
        description: "Bearer clientKey.clientSecret. Server-side use only.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error", "message", "correlationId"],
        properties: {
          error: { type: "string" },
          message: { type: "string" },
          correlationId: { type: "string", format: "uuid" },
        },
      },
    },
  },
  paths: Object.fromEntries(
    API_RESOURCES.map((resource) => [
      `/${resource}`,
      {
        get: {
          operationId: `list-${resource}`,
          responses: { "200": { description: "Scoped result" } },
        },
        post: {
          operationId: `create-${resource}`,
          parameters: [
            {
              in: "header",
              name: "Idempotency-Key",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Stable mutation result" },
            "409": { description: "Idempotency payload conflict" },
          },
        },
      },
    ])
  ),
} as const

type AuthenticatedClient = {
  id: string
  clientKey: string
  projectIds: string[]
  clientIds: string[]
  scopes: string[]
  rateLimitPerMinute: number
}

let database: ReturnType<typeof createPrismaClient> | undefined

function getPrisma() {
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString) {
    throw new IntegrationError(
      "service_unavailable",
      503,
      "The integration database is not configured."
    )
  }
  database ??= createPrismaClient(connectionString)
  return database.client
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
  correlationId: string,
  extraHeaders: Record<string, string> = {}
) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "x-request-id": correlationId,
    ...extraHeaders,
  })
  response.end(JSON.stringify(body))
}

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += value.length
    if (size > 1_048_576) {
      throw new IntegrationError(
        "payload_too_large",
        413,
        "API payloads are limited to 1 MiB."
      )
    }
    chunks.push(value)
  }
  if (chunks.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown
  } catch {
    throw new IntegrationError("invalid_json", 400, "The JSON body is invalid.")
  }
}

async function authenticate(
  prisma: PrismaClient,
  request: IncomingMessage,
  correlationId: string
): Promise<AuthenticatedClient> {
  const credential = parseBearerCredential(request.headers.authorization)
  const client = await prisma.integrationClient.findUnique({
    where: { clientKey: credential.clientKey },
  })
  if (
    !client ||
    !client.isActive ||
    client.revokedAt ||
    !verifySecret(credential.secret, client.secretHash)
  ) {
    throw new IntegrationError(
      "invalid_client",
      401,
      "The service-client credential is invalid or revoked."
    )
  }
  const minuteAgo = new Date(Date.now() - 60_000)
  const [scopes, requestCount] = await Promise.all([
    prisma.integrationScope.findMany({
      where: { integrationClientId: client.id },
      select: { scope: true },
    }),
    prisma.integrationRequestAttempt.count({
      where: {
        integrationClientId: client.id,
        createdAt: { gte: minuteAgo },
      },
    }),
  ])
  if (requestCount >= client.rateLimitPerMinute) {
    throw new IntegrationError(
      "rate_limit_exceeded",
      429,
      "The service-client request limit was reached."
    )
  }
  await prisma.integrationClient.update({
    where: { id: client.id },
    data: { lastUsedAt: new Date() },
  })
  writeLog({
    level: "info",
    event: "integration.authenticated",
    application: apiConfiguration.application,
    correlationId,
    details: { integrationClientId: client.id },
  })
  return {
    id: client.id,
    clientKey: client.clientKey,
    projectIds: client.projectIds,
    clientIds: client.clientIds,
    scopes: scopes.map((scope) => scope.scope),
    rateLimitPerMinute: client.rateLimitPerMinute,
  }
}

function queryBoundary(url: URL, client: AuthenticatedClient) {
  const projectId = url.searchParams.get("projectId")
  const clientId = url.searchParams.get("clientId")
  assertResourceAccess({
    allowedProjectIds: client.projectIds,
    allowedClientIds: client.clientIds,
    projectId,
    clientId,
  })
  return { projectId, clientId }
}

async function listResource(
  prisma: PrismaClient,
  resource: string,
  url: URL,
  client: AuthenticatedClient
) {
  const boundary = queryBoundary(url, client)
  const projectIds = boundary.projectId
    ? [boundary.projectId]
    : client.projectIds
  const projectWhere: Prisma.ProjectWhereInput = {
    id: projectIds.length ? { in: projectIds } : undefined,
    clientId: client.clientIds.length
      ? { in: client.clientIds }
      : boundary.clientId
        ? boundary.clientId
        : undefined,
  }
  switch (resource) {
    case "documents":
      return prisma.mdrDocument.findMany({
        where: { project: projectWhere },
        take: 100,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          projectId: true,
          dtgsaDocumentNumber: true,
          clientDocumentNumber: true,
          title: true,
          currentWorkflowStatus: true,
          currentRevisionId: true,
          updatedAt: true,
        },
      })
    case "revisions":
      return prisma.documentRevision.findMany({
        where: {
          document: projectIds.length
            ? { project: projectWhere }
            : client.clientIds.length || boundary.clientId
              ? { project: projectWhere }
              : undefined,
        },
        take: 100,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          documentId: true,
          revisionLabel: true,
          workflowStatus: true,
          revisionStatus: true,
          isCurrent: true,
          updatedAt: true,
        },
      })
    case "approval-cases":
      return prisma.approvalCycle.findMany({
        where: {
          revision: {
            document: projectIds.length
              ? { project: projectWhere }
              : client.clientIds.length || boundary.clientId
                ? { project: projectWhere }
                : undefined,
          },
        },
        take: 100,
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          revisionId: true,
          cycleNumber: true,
          status: true,
          isActive: true,
          sourceSystem: true,
          sourceEntityType: true,
          sourceRecordId: true,
          purpose: true,
          classification: true,
          startedAt: true,
          completedAt: true,
        },
      })
    case "approval-steps":
      return prisma.workflowStepInstance.findMany({
        where: {
          cycle: {
            revision: {
              document: projectIds.length
                ? { project: projectWhere }
                : client.clientIds.length || boundary.clientId
                  ? { project: projectWhere }
                  : undefined,
            },
          },
        },
        take: 100,
        orderBy: [{ approvalCycleId: "asc" }, { stepOrder: "asc" }],
        select: {
          id: true,
          approvalCycleId: true,
          stepKey: true,
          status: true,
          stepOrder: true,
          startedAt: true,
          completedAt: true,
        },
      })
    case "review-sessions": {
      const candidates = await prisma.reviewSession.findMany({
        take: 300,
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          stepInstanceId: true,
          startedAt: true,
          completedAt: true,
          revokedAt: true,
        },
      })
      const allowedSteps = await prisma.workflowStepInstance.findMany({
        where: {
          id: { in: candidates.map((item) => item.stepInstanceId) },
          cycle: { revision: { document: { project: projectWhere } } },
        },
        select: { id: true },
      })
      const allowed = new Set(allowedSteps.map((item) => item.id))
      return candidates
        .filter((item) => allowed.has(item.stepInstanceId))
        .slice(0, 100)
    }
    case "comments": {
      const candidates = await prisma.comment.findMany({
        take: 300,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          revisionId: true,
          body: true,
          category: true,
          blocking: true,
          state: true,
          createdAt: true,
        },
      })
      const revisions = await prisma.documentRevision.findMany({
        where: {
          id: { in: candidates.map((item) => item.revisionId) },
          document: { project: projectWhere },
        },
        select: { id: true },
      })
      const allowed = new Set(revisions.map((item) => item.id))
      return candidates
        .filter((item) => allowed.has(item.revisionId))
        .slice(0, 100)
    }
    case "client-submissions": {
      const candidates = await prisma.clientSubmission.findMany({
        take: 300,
        orderBy: { submittedAt: "desc" },
        select: {
          id: true,
          revisionId: true,
          manifestId: true,
          transmittalId: true,
          submissionNumber: true,
          submittedAt: true,
          packageHash: true,
        },
      })
      const revisions = await prisma.documentRevision.findMany({
        where: {
          id: { in: candidates.map((item) => item.revisionId) },
          document: { project: projectWhere },
        },
        select: { id: true },
      })
      const allowed = new Set(revisions.map((item) => item.id))
      return candidates
        .filter((item) => allowed.has(item.revisionId))
        .slice(0, 100)
    }
    case "client-responses": {
      const candidates = await prisma.clientResponse.findMany({
        take: 300,
        orderBy: { receivedAt: "desc" },
        select: {
          id: true,
          revisionId: true,
          submissionId: true,
          externalCodeSnapshot: true,
          labelSnapshot: true,
          outcomeClass: true,
          receivedAt: true,
          confirmedAt: true,
        },
      })
      const revisions = await prisma.documentRevision.findMany({
        where: {
          id: { in: candidates.map((item) => item.revisionId) },
          document: { project: projectWhere },
        },
        select: { id: true },
      })
      const allowed = new Set(revisions.map((item) => item.id))
      return candidates
        .filter((item) => allowed.has(item.revisionId))
        .slice(0, 100)
    }
    case "general-requests":
      return prisma.generalRequest.findMany({
        where: {
          projectId: projectIds.length ? { in: projectIds } : undefined,
          clientId: boundary.clientId
            ? boundary.clientId
            : client.clientIds.length
              ? { in: client.clientIds }
              : undefined,
        },
        take: 100,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          requestNumber: true,
          requestTypeVersionId: true,
          purpose: true,
          classification: true,
          projectId: true,
          clientId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    case "integrations":
      return prisma.integrationClient.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          clientKey: true,
          name: true,
          isActive: true,
          projectIds: true,
          clientIds: true,
          rateLimitPerMinute: true,
          lastUsedAt: true,
          secretRotatedAt: true,
          revokedAt: true,
          createdAt: true,
        },
      })
    case "webhooks":
      return prisma.webhookEndpoint.findMany({
        where: { integrationClientId: client.id },
        take: 100,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          url: true,
          eventTypes: true,
          isActive: true,
          secretRotatedAt: true,
          createdAt: true,
        },
      })
    case "downloads": {
      const candidates = await prisma.generatedArtifactRecord.findMany({
        take: 300,
        orderBy: { generatedAt: "desc" },
        select: {
          id: true,
          revisionId: true,
          artifactKind: true,
          artifactSha256: true,
          sizeBytes: true,
          generatedAt: true,
          expiresAt: true,
        },
      })
      const revisionIds = candidates
        .map((item) => item.revisionId)
        .filter((value): value is string => Boolean(value))
      const revisions = await prisma.documentRevision.findMany({
        where: {
          id: { in: revisionIds },
          document: { project: projectWhere },
        },
        select: { id: true },
      })
      const allowed = new Set(revisions.map((item) => item.id))
      const unrestricted =
        projectIds.length === 0 &&
        client.clientIds.length === 0 &&
        !boundary.clientId
      return candidates
        .filter(
          (item) =>
            (item.revisionId && allowed.has(item.revisionId)) ||
            (!item.revisionId && unrestricted)
        )
        .slice(0, 100)
    }
    case "verification":
      return { status: "ready", mode: "hash_or_code_only" }
    default:
      throw new IntegrationError(
        "resource_not_found",
        404,
        "The API resource does not exist."
      )
  }
}

async function readResource(
  prisma: PrismaClient,
  resource: string,
  id: string,
  client: AuthenticatedClient
) {
  if (resource === "approval-cases") {
    const cycle = await prisma.approvalCycle.findUnique({
      where: { id },
      include: {
        revision: {
          select: {
            document: {
              select: {
                projectId: true,
                project: { select: { clientId: true } },
              },
            },
          },
        },
        steps: {
          orderBy: { stepOrder: "asc" },
          select: {
            id: true,
            stepKey: true,
            status: true,
            stepOrder: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    })
    if (!cycle) {
      throw new IntegrationError("not_found", 404, "The case was not found.")
    }
    assertResourceAccess({
      allowedProjectIds: client.projectIds,
      allowedClientIds: client.clientIds,
      projectId: cycle.revision.document.projectId,
      clientId: cycle.revision.document.project.clientId,
    })
    return {
      id: cycle.id,
      status: cycle.status,
      isActive: cycle.isActive,
      sourceSystem: cycle.sourceSystem,
      sourceEntityType: cycle.sourceEntityType,
      sourceRecordId: cycle.sourceRecordId,
      purpose: cycle.purpose,
      classification: cycle.classification,
      startedAt: cycle.startedAt,
      completedAt: cycle.completedAt,
      steps: cycle.steps,
    }
  }
  if (resource === "downloads") {
    const artifact = await prisma.generatedArtifactRecord.findUnique({
      where: { id },
      select: {
        id: true,
        revisionId: true,
        artifactKind: true,
        artifactSha256: true,
        sizeBytes: true,
        generatedAt: true,
        expiresAt: true,
        cleanupStatus: true,
      },
    })
    if (!artifact) {
      throw new IntegrationError(
        "not_found",
        404,
        "The generated artifact was not found."
      )
    }
    if (artifact.revisionId) {
      const revision = await prisma.documentRevision.findUnique({
        where: { id: artifact.revisionId },
        include: { document: { include: { project: true } } },
      })
      if (!revision) {
        throw new IntegrationError(
          "not_found",
          404,
          "The artifact revision was not found."
        )
      }
      assertResourceAccess({
        allowedProjectIds: client.projectIds,
        allowedClientIds: client.clientIds,
        projectId: revision.document.projectId,
        clientId: revision.document.project.clientId,
      })
    } else if (client.projectIds.length || client.clientIds.length) {
      throw new IntegrationError(
        "resource_scope_denied",
        403,
        "The artifact has no compatible project boundary."
      )
    }
    return artifact
  }
  if (resource === "general-requests") {
    const request = await prisma.generalRequest.findUnique({
      where: { id },
      select: {
        id: true,
        requestNumber: true,
        requestTypeVersionId: true,
        sourceSystem: true,
        sourceEntityType: true,
        sourceRecordId: true,
        purpose: true,
        classification: true,
        projectId: true,
        clientId: true,
        formData: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!request) {
      throw new IntegrationError(
        "not_found",
        404,
        "The general request was not found."
      )
    }
    assertResourceAccess({
      allowedProjectIds: client.projectIds,
      allowedClientIds: client.clientIds,
      projectId: request.projectId,
      clientId: request.clientId,
    })
    return request
  }
  throw new IntegrationError(
    "not_found",
    404,
    "The requested resource item does not exist."
  )
}

async function createGeneralRequest(
  prisma: PrismaClient,
  input: Record<string, unknown>,
  client: AuthenticatedClient
) {
  const requestTypeVersionId = String(input.requestTypeVersionId ?? "")
  const version = await prisma.generalRequestTypeVersion.findUnique({
    where: { id: requestTypeVersionId },
  })
  if (!version || version.status !== "Published") {
    throw new IntegrationError(
      "request_type_unavailable",
      400,
      "A published request type version is required."
    )
  }
  const projectId = input.projectId ? String(input.projectId) : undefined
  const clientId = input.clientId ? String(input.clientId) : undefined
  assertResourceAccess({
    allowedProjectIds: client.projectIds,
    allowedClientIds: client.clientIds,
    projectId,
    clientId,
  })
  const formData =
    input.formData && typeof input.formData === "object"
      ? (input.formData as Record<string, unknown>)
      : {}
  validateFormSubmission(version.formDefinition as SafeField[], formData)
  const requestNumber = `GR-${new Date().getUTCFullYear()}-${randomUUID()
    .replaceAll("-", "")
    .slice(0, 10)
    .toUpperCase()}`
  const created = await prisma.generalRequest.create({
    data: {
      requestTypeVersionId: version.id,
      requestNumber,
      sourceSystem: String(input.sourceSystem ?? client.clientKey),
      sourceEntityType: String(input.sourceEntityType ?? "GENERAL_REQUEST"),
      sourceRecordId: String(input.sourceRecordId ?? requestNumber),
      sourceCallback: input.sourceCallback
        ? String(input.sourceCallback)
        : undefined,
      sourceMetadata:
        input.sourceMetadata && typeof input.sourceMetadata === "object"
          ? (input.sourceMetadata as Prisma.InputJsonValue)
          : undefined,
      purpose: String(input.purpose ?? "General approval request"),
      classification: String(input.classification ?? "INTERNAL"),
      projectId,
      clientId,
      formData: formData as Prisma.InputJsonValue,
      status: "Submitted",
    },
  })
  await prisma.outboxEvent.create({
    data: {
      eventType: "CASE_STARTED",
      aggregateType: "GeneralRequest",
      aggregateId: created.id,
      payload: { requestNumber: created.requestNumber },
    },
  })
  await prisma.backgroundJob.create({
    data: {
      jobType: "GENERAL_REQUEST_SUMMARY",
      payload: { generalRequestId: created.id },
      idempotencyKey: `general-request-summary:${created.id}`,
    },
  })
  return {
    id: created.id,
    requestNumber: created.requestNumber,
    status: created.status,
    deepLink: `/requests/${created.id}`,
  }
}

async function mutateResource(
  prisma: PrismaClient,
  resource: string,
  input: Record<string, unknown>,
  client: AuthenticatedClient,
  pathParts: string[]
) {
  if (resource === "approval-cases" && pathParts.length === 1) {
    const revisionId = String(input.revisionId ?? "")
    const snapshotId = String(input.workflowSnapshotId ?? "")
    const contentHash = String(input.contentHash ?? "")
    const revision = await prisma.documentRevision.findUnique({
      where: { id: revisionId },
      include: { document: { include: { project: true } } },
    })
    const snapshot = await prisma.workflowSnapshot.findUnique({
      where: { id: snapshotId },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    })
    if (!revision || !snapshot || !/^[a-f0-9]{64}$/i.test(contentHash)) {
      throw new IntegrationError(
        "invalid_case",
        400,
        "A valid revision, workflow snapshot, and SHA-256 content hash are required."
      )
    }
    assertResourceAccess({
      allowedProjectIds: client.projectIds,
      allowedClientIds: client.clientIds,
      projectId: revision.document.projectId,
      clientId: revision.document.project.clientId,
    })
    const latest = await prisma.approvalCycle.findFirst({
      where: { revisionId },
      orderBy: { cycleNumber: "desc" },
    })
    return prisma.$transaction(async (tx) => {
      await tx.approvalCycle.updateMany({
        where: { revisionId, isActive: true },
        data: {
          isActive: false,
          status: "Invalidated",
          invalidatedAt: new Date(),
          invalidationReason: "Superseded by integration request",
        },
      })
      const cycle = await tx.approvalCycle.create({
        data: {
          revisionId,
          snapshotId,
          cycleNumber: (latest?.cycleNumber ?? 0) + 1,
          contentHash,
          sourceSystem: String(input.sourceSystem ?? client.clientKey),
          sourceEntityType: String(
            input.sourceEntityType ?? "DOCUMENT_REVISION"
          ),
          sourceRecordId: String(input.sourceRecordId ?? revisionId),
          sourceCallback: input.sourceCallback
            ? String(input.sourceCallback)
            : undefined,
          sourceMetadata:
            input.sourceMetadata && typeof input.sourceMetadata === "object"
              ? (input.sourceMetadata as Prisma.InputJsonValue)
              : undefined,
          purpose: String(input.purpose ?? "Document approval"),
          classification: String(input.classification ?? "INTERNAL"),
          steps: {
            create: snapshot.steps.map((step, index) => ({
              stepKey: step.stepKey,
              stepOrder: step.stepOrder,
              parallelGroupId: step.parallelGroupId,
              required: step.required,
              quorum: step.quorum,
              policySnapshot: step.policySnapshot ?? Prisma.JsonNull,
              status: index === 0 ? "Active" : "Pending",
              startedAt: index === 0 ? new Date() : undefined,
            })),
          },
        },
      })
      await tx.outboxEvent.create({
        data: {
          eventType: "CASE_STARTED",
          aggregateType: "ApprovalCycle",
          aggregateId: cycle.id,
          payload: {
            sourceSystem: cycle.sourceSystem,
            sourceRecordId: cycle.sourceRecordId,
          },
        },
      })
      return { id: cycle.id, status: cycle.status }
    })
  }
  if (
    resource === "approval-cases" &&
    pathParts.length === 3 &&
    pathParts[2] === "submit"
  ) {
    const cycle = await prisma.approvalCycle.findUnique({
      where: { id: pathParts[1] },
      include: {
        revision: {
          include: { document: { include: { project: true } } },
        },
      },
    })
    if (!cycle) {
      throw new IntegrationError("not_found", 404, "The case was not found.")
    }
    assertResourceAccess({
      allowedProjectIds: client.projectIds,
      allowedClientIds: client.clientIds,
      projectId: cycle.revision.document.projectId,
      clientId: cycle.revision.document.project.clientId,
    })
    return { id: cycle.id, status: cycle.status, submitted: true }
  }
  if (
    resource === "approval-cases" &&
    pathParts.length === 3 &&
    pathParts[2] === "comments"
  ) {
    const cycle = await prisma.approvalCycle.findUnique({
      where: { id: pathParts[1] },
      include: {
        revision: {
          include: { document: { include: { project: true } } },
        },
      },
    })
    if (!cycle || !String(input.body ?? "").trim()) {
      throw new IntegrationError(
        "invalid_comment",
        400,
        "The case and comment body are required."
      )
    }
    assertResourceAccess({
      allowedProjectIds: client.projectIds,
      allowedClientIds: client.clientIds,
      projectId: cycle.revision.document.projectId,
      clientId: cycle.revision.document.project.clientId,
    })
    const comment = await prisma.comment.create({
      data: {
        revisionId: cycle.revisionId,
        authorIntegrationClientId: client.id,
        body: String(input.body).trim().slice(0, 5000),
        category: input.category ? String(input.category) : undefined,
        blocking: Boolean(input.blocking),
      },
    })
    return { id: comment.id, state: comment.state }
  }
  if (resource === "verification") {
    const codeHash = String(input.codeHash ?? "")
    const artifactHash = String(input.artifactHash ?? "")
    if (!codeHash && !artifactHash) {
      throw new IntegrationError(
        "verification_input_required",
        400,
        "A code hash or artifact hash is required."
      )
    }
    const [code, artifact] = await Promise.all([
      codeHash
        ? prisma.verificationCode.findUnique({ where: { codeHash } })
        : null,
      artifactHash
        ? prisma.generatedArtifactRecord.findFirst({
            where: { artifactSha256: artifactHash },
            select: { id: true, artifactKind: true },
          })
        : null,
    ])
    return {
      status:
        (code &&
          !code.revokedAt &&
          (!code.expiresAt || code.expiresAt > new Date())) ||
        artifact
          ? "VALID"
          : "NOT_VERIFIED",
      targetType: artifact?.artifactKind ?? code?.targetType,
    }
  }
  if (resource === "client-responses") {
    const revisionId = String(input.revisionId ?? "")
    const revision = await prisma.documentRevision.findUnique({
      where: { id: revisionId },
      include: { document: { include: { project: true } } },
    })
    if (!revision) {
      throw new IntegrationError(
        "invalid_client_response",
        400,
        "The referenced revision is unavailable."
      )
    }
    assertResourceAccess({
      allowedProjectIds: client.projectIds,
      allowedClientIds: client.clientIds,
      projectId: revision.document.projectId,
      clientId: revision.document.project.clientId,
    })
    const response = await prisma.clientResponse.create({
      data: {
        revisionId,
        submissionId: input.submissionId
          ? String(input.submissionId)
          : undefined,
        policySnapshotId: String(input.policySnapshotId ?? ""),
        responseCodeId: String(input.responseCodeId ?? ""),
        externalCodeSnapshot: String(input.externalCode ?? ""),
        labelSnapshot: String(input.label ?? ""),
        effectsSnapshot:
          input.effects && typeof input.effects === "object"
            ? (input.effects as Prisma.InputJsonValue)
            : undefined,
        incomingReference: input.incomingReference
          ? String(input.incomingReference)
          : undefined,
        comments: input.comments ? String(input.comments) : undefined,
        confirmedAt: new Date(),
      },
    })
    await prisma.outboxEvent.create({
      data: {
        eventType: "CLIENT_RESPONSE_REGISTERED",
        aggregateType: "ClientResponse",
        aggregateId: response.id,
        payload: { revisionId },
      },
    })
    return { id: response.id, receivedAt: response.receivedAt }
  }
  if (resource === "general-requests") {
    return createGeneralRequest(prisma, input, client)
  }
  if (resource === "integrations") {
    if (
      pathParts.length === 3 &&
      ["rotate", "revoke"].includes(pathParts[2] ?? "")
    ) {
      const target = await prisma.integrationClient.findUnique({
        where: { id: pathParts[1] },
      })
      if (!target) {
        throw new IntegrationError(
          "not_found",
          404,
          "The integration client was not found."
        )
      }
      if (pathParts[2] === "revoke") {
        await prisma.integrationClient.update({
          where: { id: target.id },
          data: { isActive: false, revokedAt: new Date() },
        })
        return { id: target.id, revoked: true }
      }
      const rotated = issueClientSecret()
      await prisma.integrationClient.update({
        where: { id: target.id },
        data: {
          secretHash: rotated.secretHash,
          secretRotatedAt: new Date(),
          isActive: true,
          revokedAt: null,
        },
      })
      return {
        id: target.id,
        clientKey: target.clientKey,
        clientSecret: rotated.secret,
        note: "The rotated secret is returned once.",
      }
    }
    const issued = issueClientSecret()
    const scopes = Array.isArray(input.scopes) ? input.scopes.map(String) : []
    const created = await prisma.integrationClient.create({
      data: {
        clientKey: String(input.clientKey ?? randomUUID()),
        name: String(input.name ?? "Integration client"),
        secretHash: issued.secretHash,
        projectIds: Array.isArray(input.projectIds)
          ? input.projectIds.map(String)
          : [],
        clientIds: Array.isArray(input.clientIds)
          ? input.clientIds.map(String)
          : [],
        rateLimitPerMinute: Number(input.rateLimitPerMinute ?? 120),
      },
    })
    if (scopes.length) {
      await prisma.integrationScope.createMany({
        data: scopes.map((scope) => ({
          integrationClientId: created.id,
          scope,
        })),
      })
    }
    return {
      id: created.id,
      clientKey: created.clientKey,
      clientSecret: issued.secret,
      note: "The secret is returned once and cannot be recovered.",
    }
  }
  if (resource === "webhooks") {
    const encryptionKey = process.env.WEBHOOK_ENCRYPTION_KEY?.trim()
    if (!encryptionKey) {
      throw new IntegrationError(
        "service_unavailable",
        503,
        "Webhook encryption is not configured."
      )
    }
    if (
      pathParts.length === 3 &&
      ["rotate", "revoke", "test"].includes(pathParts[2] ?? "")
    ) {
      const target = await prisma.webhookEndpoint.findFirst({
        where: { id: pathParts[1], integrationClientId: client.id },
      })
      if (!target) {
        throw new IntegrationError(
          "not_found",
          404,
          "The webhook endpoint was not found."
        )
      }
      if (pathParts[2] === "revoke") {
        await prisma.webhookEndpoint.update({
          where: { id: target.id },
          data: { isActive: false },
        })
        return { id: target.id, revoked: true }
      }
      if (pathParts[2] === "rotate") {
        const rotated = issueClientSecret()
        await prisma.webhookEndpoint.update({
          where: { id: target.id },
          data: {
            previousSecretHash: target.secretHash,
            secretHash: rotated.secretHash,
            encryptedSecret: encryptWebhookSecret(
              rotated.secret,
              encryptionKey
            ),
            secretRotatedAt: new Date(),
            secretKeyVersion: { increment: 1 },
          },
        })
        return {
          id: target.id,
          signingSecret: rotated.secret,
          note: "The rotated signing secret is returned once.",
        }
      }
      const event = await prisma.outboxEvent.create({
        data: {
          eventType: target.eventTypes[0] ?? "CASE_STARTED",
          aggregateType: "WebhookEndpointTest",
          aggregateId: target.id,
          payload: { test: true },
        },
      })
      await prisma.backgroundJob.create({
        data: {
          jobType: "WEBHOOK_DELIVER",
          payload: { endpointId: target.id, outboxEventId: event.id },
          idempotencyKey: `webhook-test:${target.id}:${event.id}`,
        },
      })
      return { id: target.id, testEventId: event.id, queued: true }
    }
    const url = assertWebhookUrl(String(input.url ?? ""))
    const eventTypes = Array.isArray(input.eventTypes)
      ? [...new Set(input.eventTypes.map(String))]
      : []
    if (
      eventTypes.length === 0 ||
      eventTypes.some(
        (eventType) => !WEBHOOK_EVENTS.includes(eventType as never)
      )
    ) {
      throw new IntegrationError(
        "invalid_webhook_events",
        400,
        "At least one supported webhook event is required."
      )
    }
    const issued = issueClientSecret()
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        integrationClientId: client.id,
        url,
        secretHash: issued.secretHash,
        encryptedSecret: encryptWebhookSecret(issued.secret, encryptionKey),
        eventTypes,
      },
    })
    return {
      id: endpoint.id,
      url: endpoint.url,
      eventTypes: endpoint.eventTypes,
      signingSecret: issued.secret,
      note: "The signing secret is returned once and cannot be recovered.",
    }
  }
  throw new IntegrationError(
    "mutation_not_supported",
    405,
    "This resource is read-only through the integration API."
  )
}

async function idempotentMutation(
  prisma: PrismaClient,
  request: IncomingMessage,
  resource: string,
  body: Record<string, unknown>,
  client: AuthenticatedClient,
  pathParts: string[]
) {
  const key = request.headers["idempotency-key"]?.toString().trim()
  if (!key || key.length > 200) {
    throw new IntegrationError(
      "idempotency_key_required",
      400,
      "A bounded Idempotency-Key is required for mutations."
    )
  }
  const scope = `${request.method}:${pathParts.join("/")}`
  const requestHash = canonicalRequestHash(body)
  const existing = await prisma.idempotencyRecord.findUnique({
    where: {
      clientId_scope_key: { clientId: client.id, scope, key },
    },
  })
  const cached = assertIdempotent(existing, requestHash)
  if (cached !== undefined && existing) {
    return { status: existing.statusCode, body: cached }
  }
  const result = await mutateResource(prisma, resource, body, client, pathParts)
  await prisma.idempotencyRecord.create({
    data: {
      clientId: client.id,
      scope,
      key,
      requestHash,
      response: result,
      statusCode: 201,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })
  return { status: 201, body: result }
}

async function recordAttempt(
  prisma: PrismaClient,
  client: AuthenticatedClient,
  correlationId: string,
  request: IncomingMessage,
  path: string,
  statusCode: number,
  boundary: { projectId?: string | null; clientId?: string | null } = {}
) {
  await prisma.integrationRequestAttempt.create({
    data: {
      integrationClientId: client.id,
      correlationId,
      method: request.method ?? "UNKNOWN",
      path,
      statusCode,
      projectId: boundary.projectId,
      clientId: boundary.clientId,
    },
  })
}

export async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse
) {
  const correlationId =
    request.headers["x-request-id"]?.toString() || randomUUID()
  const url = new URL(request.url || "/", "http://localhost")
  const path = url.pathname

  writeLog({
    level: "info",
    event: "http.request",
    application: apiConfiguration.application,
    correlationId,
    details: { method: request.method, path },
  })

  try {
    if (
      ["/health", "/ready", "/version"].includes(path) &&
      request.method !== "GET"
    ) {
      throw new IntegrationError(
        "method_not_allowed",
        405,
        "The HTTP method is not supported."
      )
    }
    if (request.method === "GET" && path === "/health") {
      sendJson(
        response,
        200,
        createHealthResponse(apiConfiguration.application),
        correlationId
      )
      return
    }
    if (request.method === "GET" && path === "/ready") {
      sendJson(
        response,
        200,
        createReadinessResponse(apiConfiguration.application),
        correlationId
      )
      return
    }
    if (request.method === "GET" && path === "/version") {
      sendJson(response, 200, apiConfiguration.build, correlationId)
      return
    }
    if (request.method === "GET" && path === "/api/v1/openapi.json") {
      sendJson(response, 200, openApiDocument, correlationId)
      return
    }
    const pathParts = path
      .replace(/^\/api\/v1\/?/, "")
      .split("/")
      .filter(Boolean)
    const resource = pathParts[0]
    if (!resource || !API_RESOURCES.includes(resource as never)) {
      throw new IntegrationError(
        "not_found",
        404,
        "The requested endpoint does not exist."
      )
    }
    if (!["GET", "POST"].includes(request.method ?? "")) {
      throw new IntegrationError(
        "method_not_allowed",
        405,
        "The HTTP method is not supported."
      )
    }
    parseBearerCredential(request.headers.authorization)
    const prisma = getPrisma()
    const client = await authenticate(prisma, request, correlationId)
    const requiredScope =
      request.method === "POST"
        ? resource === "approval-cases" && pathParts[2] === "comments"
          ? "comments:write"
          : mutationScopes[resource]
        : resourceScopes[resource]
    if (!requiredScope) {
      throw new IntegrationError(
        "method_not_allowed",
        405,
        "The resource cannot be changed through this endpoint."
      )
    }
    assertScope(client.scopes, requiredScope)
    if (request.method === "GET") {
      const result =
        pathParts.length === 1
          ? await listResource(prisma, resource, url, client)
          : pathParts.length === 2
            ? await readResource(prisma, resource, pathParts[1]!, client)
            : (() => {
                throw new IntegrationError(
                  "not_found",
                  404,
                  "The requested endpoint does not exist."
                )
              })()
      await recordAttempt(prisma, client, correlationId, request, path, 200, {
        projectId: url.searchParams.get("projectId"),
        clientId: url.searchParams.get("clientId"),
      })
      sendJson(
        response,
        200,
        { data: publicIntegrationRecord({ result }).result, correlationId },
        correlationId
      )
      return
    }
    const body = await readJson(request)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new IntegrationError(
        "invalid_payload",
        400,
        "A JSON object is required."
      )
    }
    const result = await idempotentMutation(
      prisma,
      request,
      resource,
      body as Record<string, unknown>,
      client,
      pathParts
    )
    await recordAttempt(
      prisma,
      client,
      correlationId,
      request,
      path,
      result.status
    )
    sendJson(
      response,
      result.status,
      {
        data: publicIntegrationRecord({ result: result.body }).result,
        correlationId,
      },
      correlationId
    )
  } catch (error) {
    const failure =
      error instanceof IntegrationError
        ? error
        : new IntegrationError(
            "internal_error",
            500,
            "The integration request could not be completed."
          )
    writeLog({
      level: failure.status >= 500 ? "error" : "warn",
      event: "http.request.failed",
      application: apiConfiguration.application,
      correlationId,
      details: {
        path,
        error: failure.code,
        originalError:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      },
    })
    sendJson(
      response,
      failure.status,
      {
        error: failure.code,
        message: failure.message,
        correlationId,
      },
      correlationId,
      failure.status === 429 ? { "retry-after": "60" } : {}
    )
  }
}

export function createPlatformApiServer() {
  return createServer((request, response) => {
    void handleRequest(request, response)
  })
}
