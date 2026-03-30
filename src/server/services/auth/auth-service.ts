import "server-only"
import { redirect } from "next/navigation"
import { z } from "zod"
import { ROLE_CODES } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const setupFirstAdminSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(120),
  jobTitle: z.string().trim().max(100).optional(),
})

function getMetadataRecord(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  return metadata && typeof metadata === "object" ? metadata : {}
}

function deriveFullName(input: {
  email: string
  metadata: Record<string, unknown>
}) {
  const fromMetadata =
    typeof input.metadata.full_name === "string" &&
    input.metadata.full_name.trim().length > 0
      ? input.metadata.full_name.trim()
      : typeof input.metadata.name === "string" && input.metadata.name.trim().length > 0
        ? input.metadata.name.trim()
        : null

  if (fromMetadata) {
    return fromMetadata
  }

  const fromEmail = input.email.split("@")[0].replace(/[._-]+/g, " ").trim()
  return fromEmail.replace(/\b\w/g, (character) => character.toUpperCase())
}

export async function getCurrentAuthUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function getCurrentAppUser() {
  const authUser = await getCurrentAuthUser()

  if (!authUser?.email) {
    return null
  }

  const metadata = getMetadataRecord(
    authUser.user_metadata as Record<string, unknown> | null | undefined
  )

  const user = await prisma.user.upsert({
    where: {
      email: authUser.email,
    },
    update: {
      authUserId: authUser.id,
      fullName: deriveFullName({
        email: authUser.email,
        metadata,
      }),
      jobTitle:
        typeof metadata.job_title === "string" ? metadata.job_title.trim() : null,
      timezone:
        typeof metadata.timezone === "string" && metadata.timezone.trim().length > 0
          ? metadata.timezone.trim()
          : "Asia/Riyadh",
      isActive: true,
    },
    create: {
      authUserId: authUser.id,
      email: authUser.email,
      fullName: deriveFullName({
        email: authUser.email,
        metadata,
      }),
      jobTitle:
        typeof metadata.job_title === "string" ? metadata.job_title.trim() : null,
      timezone:
        typeof metadata.timezone === "string" && metadata.timezone.trim().length > 0
          ? metadata.timezone.trim()
          : "Asia/Riyadh",
      isActive: true,
    },
    include: {
      signatureProfile: true,
      userRoles: {
        include: {
          role: true,
        },
      },
      projectRoles: {
        include: {
          role: true,
          project: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
    },
  })

  return user
}

export async function requireCurrentAppUser() {
  const user = await getCurrentAppUser()

  if (!user) {
    redirect("/sign-in")
  }

  return user
}

export async function getAuthSetupState() {
  const [domainUserCount, roleCount] = await Promise.all([
    prisma.user.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.role.count(),
  ])

  return {
    requiresBootstrap: domainUserCount === 0 && roleCount > 0,
    domainUserCount,
  }
}

export async function setupFirstAdmin(input: unknown) {
  const parsed = setupFirstAdminSchema.parse(input)
  const state = await getAuthSetupState()

  if (!state.requiresBootstrap) {
    throw new Error("Bootstrap setup is no longer available.")
  }

  const supabaseAdmin = createSupabaseAdminClient()
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: parsed.email,
    password: parsed.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.fullName,
      job_title: parsed.jobTitle?.trim() || null,
      timezone: "Asia/Riyadh",
    },
  })

  if (error || !data.user?.email) {
    throw new Error(error?.message ?? "Failed to create the first admin user.")
  }

  const [superAdminRole, systemAdminRole] = await Promise.all([
    prisma.role.findUnique({
      where: {
        code: ROLE_CODES.superAdmin,
      },
    }),
    prisma.role.findUnique({
      where: {
        code: ROLE_CODES.systemAdmin,
      },
    }),
  ])

  if (!superAdminRole || !systemAdminRole) {
    throw new Error("Required admin roles are missing from the database seed.")
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        authUserId: data.user.id,
        email: data.user.email!,
        fullName: parsed.fullName.trim(),
        jobTitle: parsed.jobTitle?.trim() || null,
        timezone: "Asia/Riyadh",
        isActive: true,
      },
    })

    await tx.userRole.createMany({
      data: [
        {
          userId: user.id,
          roleId: superAdminRole.id,
        },
        {
          userId: user.id,
          roleId: systemAdminRole.id,
        },
      ],
      skipDuplicates: true,
    })

    return user
  })
}

export async function signInWithPassword(input: {
  email: string
  password: string
}) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword(input)

  if (error) {
    throw new Error(error.message)
  }
}

export async function signOutCurrentUser() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
}
