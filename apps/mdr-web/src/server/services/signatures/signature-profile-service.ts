import "server-only"
import sharp from "sharp"
import { AuditSeverity } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma/client"
import {
  buildStorageKey,
  uploadBytesToStorage,
} from "@/server/services/storage/storage-service"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  jobTitle: z.string().trim().max(100).optional(),
  timezone: z.string().trim().min(1).max(80),
})

function isFileLike(value: unknown): value is File {
  return value instanceof File && value.size > 0
}

async function normalizeSignatureAsset(file: File, kind: "signature" | "initials") {
  const inputBytes = Buffer.from(await file.arrayBuffer())
  const width = kind === "signature" ? 640 : 320
  const height = kind === "signature" ? 220 : 180
  const outputBytes = await sharp(inputBytes)
    .resize({
      width,
      height,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png({
      compressionLevel: 9,
    })
    .toBuffer()

  return {
    bytes: outputBytes,
    fileName: `${kind}.png`,
    mimeType: "image/png",
  }
}

export async function getProfileOverview(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      signatureProfile: true,
      signatureEvents: {
        orderBy: [{ signedAt: "desc" }],
        take: 10,
      },
    },
  })

  if (!user) {
    throw new Error("User profile could not be found.")
  }

  const signatureUrl = user.signatureProfile?.signatureProviderKey
    ? "/api/profile/signature?kind=signature"
    : null
  const initialsUrl = user.signatureProfile?.initialsProviderKey
    ? "/api/profile/signature?kind=initials"
    : null

  return {
    user,
    signatureUrl,
    initialsUrl,
  }
}

export async function updateUserProfile(
  actor: CurrentAppUser,
  input: {
    fullName: unknown
    jobTitle: unknown
    timezone: unknown
    signatureFile?: unknown
    initialsFile?: unknown
  }
) {
  const parsed = updateProfileSchema.parse({
    fullName: input.fullName,
    jobTitle:
      typeof input.jobTitle === "string" ? input.jobTitle.trim() : undefined,
    timezone: input.timezone,
  })

  const signatureFile = isFileLike(input.signatureFile) ? input.signatureFile : null
  const initialsFile = isFileLike(input.initialsFile) ? input.initialsFile : null

  return prisma.$transaction(async (tx) => {
    let signatureProfile = await tx.signatureProfile.findUnique({
      where: {
        userId: actor.id,
      },
    })

    let signatureUpload:
      | Awaited<ReturnType<typeof uploadBytesToStorage>>
      | null = null
    let initialsUpload:
      | Awaited<ReturnType<typeof uploadBytesToStorage>>
      | null = null

    if (signatureFile) {
      const normalized = await normalizeSignatureAsset(signatureFile, "signature")

      signatureUpload = await uploadBytesToStorage({
        area: "controlled",
        providerKeyHint: buildStorageKey(
          "signatures",
          actor.id,
          "signature",
          normalized.fileName
        ),
        bytes: normalized.bytes,
        fileName: normalized.fileName,
        mimeType: normalized.mimeType,
      })
    }

    if (initialsFile) {
      const normalized = await normalizeSignatureAsset(initialsFile, "initials")

      initialsUpload = await uploadBytesToStorage({
        area: "controlled",
        providerKeyHint: buildStorageKey(
          "signatures",
          actor.id,
          "initials",
          normalized.fileName
        ),
        bytes: normalized.bytes,
        fileName: normalized.fileName,
        mimeType: normalized.mimeType,
      })
    }

    const updatedUser = await tx.user.update({
      where: {
        id: actor.id,
      },
      data: {
        fullName: parsed.fullName,
        jobTitle: parsed.jobTitle?.trim() || null,
        timezone: parsed.timezone,
      },
    })

    if (signatureProfile) {
      signatureProfile = await tx.signatureProfile.update({
        where: {
          id: signatureProfile.id,
        },
        data: {
          signatureStorageProvider:
            signatureUpload?.storageProvider ??
            signatureProfile.signatureStorageProvider,
          signatureProviderKey:
            signatureUpload?.providerKey ??
            signatureProfile.signatureProviderKey,
          initialsStorageProvider:
            initialsUpload?.storageProvider ??
            signatureProfile.initialsStorageProvider,
          initialsProviderKey:
            initialsUpload?.providerKey ?? signatureProfile.initialsProviderKey,
          mimeType: signatureUpload?.mimeType ?? signatureProfile.mimeType,
        },
      })
    } else if (signatureUpload || initialsUpload) {
      signatureProfile = await tx.signatureProfile.create({
        data: {
          userId: actor.id,
          signatureStorageProvider: signatureUpload?.storageProvider ?? null,
          signatureProviderKey: signatureUpload?.providerKey ?? null,
          initialsStorageProvider: initialsUpload?.storageProvider ?? null,
          initialsProviderKey: initialsUpload?.providerKey ?? null,
          mimeType: signatureUpload?.mimeType ?? null,
        },
      })
    }

    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "profile.update",
        entityType: "User",
        entityId: actor.id,
        severity: AuditSeverity.Info,
        afterSnapshot: {
          fullName: updatedUser.fullName,
          jobTitle: updatedUser.jobTitle,
          timezone: updatedUser.timezone,
          signatureConfigured: Boolean(signatureProfile?.signatureProviderKey),
          initialsConfigured: Boolean(signatureProfile?.initialsProviderKey),
        },
      },
    })

    return {
      user: updatedUser,
      signatureProfile,
    }
  })
}
