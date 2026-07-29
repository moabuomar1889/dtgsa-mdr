import "server-only"
import {
  hashOpaqueToken,
  type DirectoryUser,
  type WorkspaceDirectoryAdapter,
} from "@dtg/identity-domain"
import { google } from "googleapis"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma/client"
import { env } from "@/lib/config/env"
import { getIdentityConfig } from "./identity-config"
import { revokeAllUserSessions } from "./session-service"

export class GoogleWorkspaceDirectoryAdapter implements WorkspaceDirectoryAdapter {
  private readonly directory

  constructor() {
    const config = getIdentityConfig()
    if (
      !config.directorySyncEnabled ||
      !env.GOOGLE_DRIVE_CLIENT_EMAIL ||
      !env.GOOGLE_DRIVE_PRIVATE_KEY ||
      !env.GOOGLE_ADMIN_EMAIL
    ) {
      throw new Error(
        "Google Directory synchronization requires explicit enablement and delegated service credentials."
      )
    }
    const auth = new google.auth.JWT({
      email: env.GOOGLE_DRIVE_CLIENT_EMAIL,
      key: env.GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      subject: env.GOOGLE_ADMIN_EMAIL,
      scopes: [
        "https://www.googleapis.com/auth/admin.directory.user.readonly",
        "https://www.googleapis.com/auth/admin.directory.group.member.readonly",
      ],
    })
    this.directory = google.admin({ version: "directory_v1", auth })
  }

  async listUsers(input: { cursor?: string; dryRun: boolean }) {
    const response = await this.directory.users.list({
      customer: "my_customer",
      maxResults: 100,
      orderBy: "email",
      pageToken: input.cursor,
      projection: "full",
    })
    const users: DirectoryUser[] = []
    for (const record of response.data.users ?? []) {
      if (!record.id || !record.primaryEmail) continue
      const groups = await this.directory.groups.list({
        userKey: record.primaryEmail,
        maxResults: 200,
      })
      const organizations = record.organizations ?? []
      const organization =
        organizations.find(
          (entry: { primary?: boolean | null }) => entry.primary
        ) ?? organizations[0]
      const employeeId = record.externalIds?.find(
        (entry: { type?: string | null; value?: string | null }) =>
          entry.type === "organization"
      )?.value
      users.push({
        subject: record.id,
        primaryEmail: record.primaryEmail,
        fullName:
          record.name?.fullName?.trim() || record.primaryEmail.split("@")[0],
        employeeId: employeeId ?? undefined,
        department: organization?.department ?? undefined,
        jobTitle: organization?.title ?? undefined,
        suspended: record.suspended ?? false,
        groups: (groups.data.groups ?? [])
          .map((group) => group.id)
          .filter((groupId): groupId is string => Boolean(groupId)),
      })
    }
    return {
      users,
      nextCursor: response.data.nextPageToken ?? undefined,
    }
  }
}

async function recordLinkReview(input: {
  subject: string
  email: string
  candidateUserIds: string[]
}) {
  const subjectHash = hashOpaqueToken(input.subject)
  return prisma.identityLinkReview.upsert({
    where: {
      provider_subjectHash_status: {
        provider: "google_workspace",
        subjectHash,
        status: "Pending",
      },
    },
    update: {
      email: input.email,
      candidateUserIds: input.candidateUserIds,
    },
    create: {
      provider: "google_workspace",
      subjectHash,
      email: input.email,
      candidateUserIds: input.candidateUserIds,
    },
  })
}

async function resolveDirectoryUser(directoryUser: DirectoryUser) {
  const subjectIdentity = await prisma.googleWorkspaceIdentity.findUnique({
    where: { googleSubject: directoryUser.subject },
    include: {
      identity: {
        include: { user: true },
      },
    },
  })
  const emailMatches = await prisma.user.findMany({
    where: {
      email: {
        equals: directoryUser.primaryEmail,
        mode: "insensitive",
      },
      deletedAt: null,
    },
    take: 2,
  })

  if (
    subjectIdentity &&
    emailMatches.some((user) => user.id !== subjectIdentity.identity.userId)
  ) {
    await recordLinkReview({
      subject: directoryUser.subject,
      email: directoryUser.primaryEmail,
      candidateUserIds: [
        subjectIdentity.identity.userId,
        ...emailMatches.map((user) => user.id),
      ],
    })
    return null
  }
  if (!subjectIdentity && emailMatches.length > 1) {
    await recordLinkReview({
      subject: directoryUser.subject,
      email: directoryUser.primaryEmail,
      candidateUserIds: emailMatches.map((user) => user.id),
    })
    return null
  }
  return {
    user: subjectIdentity?.identity.user ?? emailMatches[0] ?? null,
    subjectIdentity,
  }
}

async function reconcileDirectoryRoles(
  tx: Prisma.TransactionClient,
  userId: string,
  groupIds: string[]
) {
  const mappings = await tx.googleGroupMapping.findMany({
    where: {
      groupId: { in: groupIds },
      isActive: true,
    },
  })
  const desiredMappingIds = new Set(mappings.map((mapping) => mapping.id))
  const existingAssignments = await tx.directoryRoleAssignment.findMany({
    where: { userId, inactiveAt: null },
    include: { role: true },
  })

  for (const assignment of existingAssignments) {
    if (desiredMappingIds.has(assignment.mappingId)) continue
    const inactiveAt = new Date()
    await tx.directoryRoleAssignment.update({
      where: { id: assignment.id },
      data: { inactiveAt },
    })
    if (!assignment.createdGrant) continue
    const [otherMapping, activeOverride] = await Promise.all([
      tx.directoryRoleAssignment.findFirst({
        where: {
          userId,
          roleId: assignment.roleId,
          projectId: assignment.projectId,
          inactiveAt: null,
          id: { not: assignment.id },
        },
      }),
      tx.identityRoleOverride.findFirst({
        where: {
          userId,
          roleCode: assignment.role.code,
          projectId: assignment.projectId,
          inactiveAt: null,
        },
      }),
    ])
    if (otherMapping || activeOverride) continue
    if (assignment.projectId) {
      await tx.userProjectRole.deleteMany({
        where: {
          userId,
          projectId: assignment.projectId,
          roleId: assignment.roleId,
        },
      })
    } else {
      await tx.userRole.deleteMany({
        where: { userId, roleId: assignment.roleId },
      })
    }
  }

  for (const mapping of mappings) {
    const role = await tx.role.findUnique({
      where: { code: mapping.roleCode },
    })
    if (!role) continue
    const existingGrant = mapping.projectId
      ? await tx.userProjectRole.findUnique({
          where: {
            userId_projectId_roleId: {
              userId,
              projectId: mapping.projectId,
              roleId: role.id,
            },
          },
        })
      : await tx.userRole.findUnique({
          where: {
            userId_roleId: { userId, roleId: role.id },
          },
        })
    if (!existingGrant) {
      if (mapping.projectId) {
        await tx.userProjectRole.create({
          data: {
            userId,
            projectId: mapping.projectId,
            roleId: role.id,
          },
        })
      } else {
        await tx.userRole.create({
          data: { userId, roleId: role.id },
        })
      }
    }
    await tx.directoryRoleAssignment.upsert({
      where: {
        userId_mappingId: {
          userId,
          mappingId: mapping.id,
        },
      },
      update: {
        roleId: role.id,
        projectId: mapping.projectId,
        inactiveAt: null,
        activeAt: new Date(),
        createdGrant: !existingGrant,
      },
      create: {
        userId,
        mappingId: mapping.id,
        roleId: role.id,
        projectId: mapping.projectId,
        createdGrant: !existingGrant,
      },
    })
  }

  return mappings
}

async function synchronizeUser(directoryUser: DirectoryUser, dryRun: boolean) {
  const config = getIdentityConfig()
  const emailDomain = directoryUser.primaryEmail.toLowerCase().split("@")[1]
  if (!emailDomain || !config.allowedDomains.includes(emailDomain)) {
    throw new Error("Directory user is outside the allowed Workspace domains.")
  }
  const resolved = await resolveDirectoryUser(directoryUser)
  if (!resolved) return { changed: false, reviewRequired: true }
  if (dryRun) {
    return {
      changed: true,
      reviewRequired: false,
      suspended: directoryUser.suspended,
      groupsSeen: directoryUser.groups.length,
      groupsChanged: 0,
    }
  }

  const synchronized = await prisma.$transaction(async (tx) => {
    let user = resolved.user
    if (!user) {
      user = await tx.user.create({
        data: {
          email: directoryUser.primaryEmail.toLowerCase(),
          fullName: directoryUser.fullName,
          jobTitle: directoryUser.jobTitle,
          isActive: !directoryUser.suspended,
        },
      })
    } else {
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          email: directoryUser.primaryEmail.toLowerCase(),
          fullName: directoryUser.fullName,
          jobTitle: directoryUser.jobTitle,
          isActive: !directoryUser.suspended,
        },
      })
    }

    if (!resolved.subjectIdentity) {
      const identity = await tx.userIdentity.create({
        data: {
          userId: user.id,
          provider: "google_workspace",
          subject: directoryUser.subject,
          emailAtLink: directoryUser.primaryEmail.toLowerCase(),
          metadata: { linkingMethod: "directory_sync" },
        },
      })
      await tx.googleWorkspaceIdentity.create({
        data: {
          userIdentityId: identity.id,
          googleSubject: directoryUser.subject,
          hostedDomain: emailDomain,
          lastVerifiedAt: new Date(),
        },
      })
    } else {
      await tx.googleWorkspaceIdentity.update({
        where: { id: resolved.subjectIdentity.id },
        data: {
          hostedDomain: emailDomain,
          lastVerifiedAt: new Date(),
        },
      })
    }

    let departmentId: string | undefined
    if (directoryUser.department?.trim()) {
      const departmentCode = directoryUser.department
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .slice(0, 50)
      const department = await tx.department.upsert({
        where: { code: departmentCode },
        update: { name: directoryUser.department.trim(), isActive: true },
        create: {
          code: departmentCode,
          name: directoryUser.department.trim(),
        },
      })
      departmentId = department.id
    }

    const mappings = await reconcileDirectoryRoles(
      tx,
      user.id,
      directoryUser.groups
    )
    departmentId =
      mappings.find((mapping) => mapping.departmentId)?.departmentId ??
      departmentId
    await tx.employeeProfile.upsert({
      where: { userId: user.id },
      update: {
        employeeCode: directoryUser.employeeId,
        departmentId,
        inactiveAt: directoryUser.suspended ? new Date() : null,
      },
      create: {
        userId: user.id,
        employeeCode: directoryUser.employeeId,
        departmentId,
        inactiveAt: directoryUser.suspended ? new Date() : null,
      },
    })
    if (directoryUser.suspended) {
      await tx.workflowAssignment.updateMany({
        where: {
          assigneeType: "User",
          assigneeId: user.id,
          reassignmentRequiredAt: null,
        },
        data: {
          reassignmentRequiredAt: new Date(),
          reassignmentReason: "Workspace account suspended",
        },
      })
    }
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        action: directoryUser.suspended
          ? "identity.directory.user_suspended"
          : "identity.directory.user_synchronized",
        entityType: "User",
        entityId: user.id,
        afterSnapshot: {
          suspended: directoryUser.suspended,
          groupCount: directoryUser.groups.length,
        },
      },
    })
    return user
  })

  if (directoryUser.suspended) {
    await revokeAllUserSessions(synchronized.id, "Workspace account suspended")
  }
  return {
    changed: true,
    reviewRequired: false,
    suspended: directoryUser.suspended,
    groupsSeen: directoryUser.groups.length,
    groupsChanged: directoryUser.groups.length,
  }
}

export async function synchronizeWorkspaceDirectory(
  adapter: WorkspaceDirectoryAdapter,
  input: { dryRun?: boolean; cursor?: string } = {}
) {
  const dryRun = input.dryRun ?? false
  const run = await prisma.directorySyncRun.create({
    data: {
      status: dryRun ? "DryRun" : "Running",
      isDryRun: dryRun,
      cursor: input.cursor,
    },
  })
  let cursor = input.cursor
  let usersSeen = 0
  let usersChanged = 0
  let groupsSeen = 0
  let groupsChanged = 0

  try {
    do {
      const page = await adapter.listUsers({ cursor, dryRun })
      for (const user of page.users) {
        usersSeen += 1
        const result = await synchronizeUser(user, dryRun)
        if (result.changed) usersChanged += 1
        groupsSeen += result.groupsSeen ?? user.groups.length
        groupsChanged += result.groupsChanged ?? 0
      }
      cursor = page.nextCursor
      await prisma.directorySyncRun.update({
        where: { id: run.id },
        data: {
          cursor,
          usersSeen,
          usersChanged,
          groupsSeen,
          groupsChanged,
        },
      })
    } while (cursor)

    return prisma.directorySyncRun.update({
      where: { id: run.id },
      data: {
        status: dryRun ? "DryRun" : "Completed",
        usersSeen,
        usersChanged,
        groupsSeen,
        groupsChanged,
        completedAt: new Date(),
      },
    })
  } catch (error) {
    await prisma.directorySyncRun.update({
      where: { id: run.id },
      data: {
        status: "Failed",
        usersSeen,
        usersChanged,
        groupsSeen,
        groupsChanged,
        errorSummary:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Unknown directory synchronization failure.",
        completedAt: new Date(),
      },
    })
    throw error
  }
}
