import { NextResponse } from "next/server"
import { ROLE_CODES } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import { getCurrentAppUser } from "@/server/services/auth/auth-service"
import { downloadFileFromSupabaseStorage } from "@/server/services/storage/storage-service"

export const dynamic = "force-dynamic"

function parseScope(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const scope = value as Record<string, unknown>
  return typeof scope.projectId === "string"
    ? { projectId: scope.projectId }
    : null
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ artifactId: string }> }
) {
  const actor = await getCurrentAppUser()
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { artifactId } = await context.params
  const artifact = await prisma.generatedArtifactRecord.findUnique({
    where: { id: artifactId },
  })
  if (
    !artifact ||
    artifact.authoritative ||
    artifact.cleanupStatus !== "Available" ||
    !artifact.expiresAt ||
    artifact.expiresAt <= new Date()
  ) {
    return NextResponse.json({ error: "Artifact unavailable" }, { status: 404 })
  }
  const scope = parseScope(artifact.authorizationScope)
  const privileged = new Set<string>([
    ROLE_CODES.superAdmin,
    ROLE_CODES.systemAdmin,
    ROLE_CODES.documentControlAdmin,
  ])
  const permitted =
    artifact.requesterUserId === actor.id ||
    actor.userRoles.some(({ role }) => privileged.has(role.code)) ||
    Boolean(
      scope &&
      actor.projectRoles.some(
        (assignment) => assignment.projectId === scope.projectId
      )
    )
  if (!permitted) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const file = await prisma.fileObject.findUnique({
    where: { id: artifact.fileObjectId },
  })
  if (!file || file.deletedAt) {
    return NextResponse.json({ error: "Artifact unavailable" }, { status: 404 })
  }
  const separator = file.providerKey.indexOf("/")
  if (separator <= 0) {
    return NextResponse.json({ error: "Artifact unavailable" }, { status: 404 })
  }
  const bytes = await downloadFileFromSupabaseStorage(
    file.providerKey.slice(0, separator),
    file.providerKey.slice(separator + 1)
  )
  await prisma.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: "artifact.signed_internal_downloaded",
      entityType: "GeneratedArtifactRecord",
      entityId: artifact.id,
      projectId: scope?.projectId,
      relevantHashes: {
        packageHash: artifact.packageHash,
        artifactSha256: artifact.artifactSha256,
      },
    },
  })
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename="${file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
      "X-Artifact-SHA256": artifact.artifactSha256 ?? file.checksum,
    },
  })
}
