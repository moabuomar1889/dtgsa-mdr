import "server-only"
import { AuditSeverity } from "@prisma/client"
import type { User } from "@supabase/supabase-js"
import { env } from "@/lib/config/env"
import { prisma } from "@/lib/prisma/client"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type SyncResult = {
  created: number
  updated: number
  skipped: number
}

function getMetadataRecord(user: User) {
  return typeof user.user_metadata === "object" && user.user_metadata !== null
    ? user.user_metadata
    : {}
}

function deriveFullName(user: User) {
  const metadata = getMetadataRecord(user)
  const fullName =
    typeof metadata.full_name === "string" && metadata.full_name.trim().length > 0
      ? metadata.full_name.trim()
      : typeof metadata.name === "string" && metadata.name.trim().length > 0
        ? metadata.name.trim()
        : user.email?.split("@")[0]?.replace(/[._-]+/g, " ") ?? "Unknown User"

  return fullName.replace(/\b\w/g, (character) => character.toUpperCase())
}

function deriveJobTitle(user: User) {
  const metadata = getMetadataRecord(user)
  const title =
    typeof metadata.job_title === "string"
      ? metadata.job_title
      : typeof metadata.title === "string"
        ? metadata.title
        : null

  return title?.trim() || null
}

function deriveTimezone(user: User) {
  const metadata = getMetadataRecord(user)
  const timezone =
    typeof metadata.timezone === "string" ? metadata.timezone.trim() : null

  return timezone || env.DEFAULT_TIMEZONE
}

export async function syncSupabaseUsers(): Promise<SyncResult> {
  const supabase = createSupabaseAdminClient()
  let page = 1
  const perPage = 200
  let created = 0
  let updated = 0
  let skipped = 0

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      throw error
    }

    const authUsers = data.users ?? []

    if (authUsers.length === 0) {
      break
    }

    for (const authUser of authUsers) {
      if (!authUser.email) {
        skipped += 1
        continue
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ authUserId: authUser.id }, { email: authUser.email }],
        },
        select: {
          id: true,
        },
      })

      const nextData = {
        authUserId: authUser.id,
        email: authUser.email,
        fullName: deriveFullName(authUser),
        jobTitle: deriveJobTitle(authUser),
        timezone: deriveTimezone(authUser),
        isActive: true,
      }

      if (existingUser) {
        await prisma.user.update({
          where: {
            id: existingUser.id,
          },
          data: nextData,
        })
        updated += 1
      } else {
        await prisma.user.create({
          data: nextData,
        })
        created += 1
      }
    }

    if (authUsers.length < perPage) {
      break
    }

    page += 1
  }

  await prisma.auditLog.create({
    data: {
      action: "user.sync_from_supabase",
      entityType: "User",
      entityId: "supabase-auth",
      severity: AuditSeverity.Info,
      afterSnapshot: {
        created,
        updated,
        skipped,
      },
    },
  })

  return {
    created,
    updated,
    skipped,
  }
}
