import "server-only"
import { AuditSeverity } from "@prisma/client"
import { prisma } from "@/lib/prisma/client"

// The owner chose to hold the cover logo inline in PostgreSQL. `AGENTS.md`
// otherwise keeps file bytes out of the database, so this stays a small brand
// asset by construction: a hard byte cap and a raster/vector allowlist. Nothing
// document-sized can be stored through this path.
export const CLIENT_LOGO_MAX_BYTES = 256 * 1024
export const CLIENT_LOGO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const

export type ClientLogoMimeType = (typeof CLIENT_LOGO_MIME_TYPES)[number]

function assertAllowedMimeType(value: string): asserts value is ClientLogoMimeType {
  if (!CLIENT_LOGO_MIME_TYPES.includes(value as ClientLogoMimeType)) {
    throw new Error(
      `Client logos must be PNG, JPEG, WebP or SVG. Received ${value || "an unknown type"}.`
    )
  }
}

export async function setClientLogo(input: {
  clientId: string
  file: unknown
  actorUserId?: string
}) {
  const file = input.file instanceof File ? input.file : null

  if (!file || file.size === 0) {
    throw new Error("A logo image file is required.")
  }

  if (file.size > CLIENT_LOGO_MAX_BYTES) {
    throw new Error(
      `The logo is ${Math.ceil(file.size / 1024)} KB. Client logos are limited to ${CLIENT_LOGO_MAX_BYTES / 1024} KB because they are stored with the client record.`
    )
  }

  assertAllowedMimeType(file.type)

  const bytes = Buffer.from(await file.arrayBuffer())

  // Re-check after reading: `File.size` is caller-reported metadata.
  if (bytes.byteLength > CLIENT_LOGO_MAX_BYTES) {
    throw new Error("The uploaded logo exceeds the permitted size.")
  }

  const client = await prisma.client.findUnique({
    where: { id: input.clientId },
    select: { id: true, deletedAt: true, logoFileName: true },
  })

  if (!client || client.deletedAt) {
    throw new Error("The selected client could not be found.")
  }

  const updated = await prisma.client.update({
    where: { id: client.id },
    data: {
      logoBase64: bytes.toString("base64"),
      logoMimeType: file.type,
      logoFileName: file.name || "logo",
      logoByteSize: bytes.byteLength,
    },
    select: { id: true, logoFileName: true, logoByteSize: true },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: "client.logo.update",
      entityType: "Client",
      entityId: client.id,
      clientId: client.id,
      severity: AuditSeverity.Info,
      beforeSnapshot: { logoFileName: client.logoFileName },
      afterSnapshot: {
        logoFileName: updated.logoFileName,
        logoByteSize: updated.logoByteSize,
        mimeType: file.type,
      },
    },
  })

  return updated
}

export async function clearClientLogo(input: {
  clientId: string
  actorUserId?: string
}) {
  const updated = await prisma.client.update({
    where: { id: input.clientId },
    data: {
      logoBase64: null,
      logoMimeType: null,
      logoFileName: null,
      logoByteSize: null,
    },
    select: { id: true },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: "client.logo.clear",
      entityType: "Client",
      entityId: updated.id,
      clientId: updated.id,
      severity: AuditSeverity.Info,
    },
  })

  return updated
}
