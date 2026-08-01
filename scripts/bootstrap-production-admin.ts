import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { AuditSeverity, PrismaClient } from "@prisma/client"
import { ROLE_CODES } from "@/lib/permissions/rbac"

const databaseUrl =
  process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL
const configuredEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
const allowedDomain = process.env.ALLOWED_IDENTITY_DOMAIN?.trim().toLowerCase()

if (!databaseUrl) {
  throw new Error("MIGRATION_DATABASE_URL or DATABASE_URL is required.")
}

if (!configuredEmail || !allowedDomain) {
  throw new Error(
    "BOOTSTRAP_ADMIN_EMAIL and ALLOWED_IDENTITY_DOMAIN are required."
  )
}

const separatorIndex = configuredEmail.lastIndexOf("@")
const emailDomain = configuredEmail.slice(separatorIndex + 1)

if (separatorIndex < 1 || emailDomain !== allowedDomain) {
  throw new Error(
    "BOOTSTRAP_ADMIN_EMAIL must belong to ALLOWED_IDENTITY_DOMAIN."
  )
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
})

function displayNameFromEmail(email: string) {
  return email
    .slice(0, email.lastIndexOf("@"))
    .split(/[._-]+/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const superAdminRole = await tx.role.findUnique({
      where: { code: ROLE_CODES.superAdmin },
    })

    if (!superAdminRole) {
      throw new Error(
        "The foundation roles are missing. Run the foundation seed first."
      )
    }

    const existing = await tx.user.findUnique({
      where: { email: configuredEmail },
      include: {
        userRoles: {
          where: { roleId: superAdminRole.id },
          select: { id: true },
        },
      },
    })

    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: { isActive: true, deletedAt: null },
        })
      : await tx.user.create({
          data: {
            email: configuredEmail,
            fullName: displayNameFromEmail(configuredEmail),
            timezone: "Asia/Amman",
            isActive: true,
          },
        })

    const roleWasAdded = existing?.userRoles.length !== 1

    if (roleWasAdded) {
      await tx.userRole.upsert({
        where: {
          userId_roleId: { userId: user.id, roleId: superAdminRole.id },
        },
        update: {},
        create: { userId: user.id, roleId: superAdminRole.id },
      })
    }

    if (!existing || !existing.isActive || existing.deletedAt || roleWasAdded) {
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: "identity.bootstrap_admin.provisioned",
          entityType: "User",
          entityId: user.id,
          severity: AuditSeverity.Warning,
          afterSnapshot: {
            email: configuredEmail,
            role: ROLE_CODES.superAdmin,
          },
        },
      })
    }

    const totalUsers = await tx.user.count()
    const adminRoles = await tx.userRole.count({
      where: { userId: user.id, roleId: superAdminRole.id },
    })

    if (totalUsers !== 1 || adminRoles !== 1) {
      throw new Error(
        "Production bootstrap requires exactly one user and one owner role."
      )
    }

    return { created: !existing, totalUsers, adminRoles }
  })

  console.log(
    `Production administrator bootstrap completed: created=${result.created} users=${result.totalUsers} owner_roles=${result.adminRoles}`
  )
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Bootstrap failed.")
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
