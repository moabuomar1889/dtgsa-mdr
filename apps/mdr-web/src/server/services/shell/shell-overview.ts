import "server-only"
import { cache } from "react"
import {
  ClientReplyState,
  PdiStatus,
  TransmittalStatus,
  WorkflowStatus,
} from "@prisma/client"
import { PERMISSIONS, hasAnyPermission } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

export type ShellProjectOption = {
  id: string
  code: string
  name: string
  clientName: string
  role: string
}

export type ShellOverview = {
  counts: {
    projects: number
    pdi: number
    mdr: number
    transmittals: number
    replies: number
    tasks: number
  }
  submission: {
    submittedCount: number
    totalCount: number
    percent: number
  }
  projects: ShellProjectOption[]
}

function grants(user: CurrentAppUser, required: Parameters<typeof hasAnyPermission>[0]["required"]) {
  return hasAnyPermission({
    required,
    systemRoles: user.userRoles.map((item) => item.role.code),
    projectRoles: user.projectRoles.map((item) => item.role.code),
  })
}

// The shell renders on every authenticated page, so this stays to indexed
// COUNT queries plus one small project page. It is `cache`d per request and
// rendered inside the shell's Suspense boundary, so it never blocks navigation.
export const getShellOverview = cache(
  async (user: CurrentAppUser): Promise<ShellOverview> => {
    const canSeePdi = grants(user, [
      PERMISSIONS.pdiManage,
      PERMISSIONS.pdiCollaborate,
    ])
    const canSeeMdr = grants(user, [
      PERMISSIONS.mdrManage,
      PERMISSIONS.workflowPrepare,
      PERMISSIONS.workflowReview,
      PERMISSIONS.workflowApprove,
      PERMISSIONS.dcCheck,
    ])
    const canSeeTransmittals = grants(user, PERMISSIONS.transmittalsManage)
    const canSeeReplies = grants(user, PERMISSIONS.clientRepliesManage)

    // Eight separate `count()` calls cost eight round-trips on every
    // authenticated render and measurably raised shell latency. This is one
    // round-trip of scalar subqueries; the statement is fully static, so no
    // caller input reaches SQL.
    const [rawCounts, projectRows] = await Promise.all([
      prisma.$queryRaw<
        Array<Record<string, bigint>>
      >`
        SELECT
          (SELECT count(*) FROM "Project" WHERE "deletedAt" IS NULL) AS projects,
          (SELECT count(*) FROM "PdiItem"
             WHERE "deletedAt" IS NULL
               AND "status" IN (${PdiStatus.SentToClient}::"PdiStatus",
                                ${PdiStatus.ClientNumberPending}::"PdiStatus")) AS pdi,
          (SELECT count(*) FROM "MdrDocument" WHERE "deletedAt" IS NULL) AS mdr,
          (SELECT count(*) FROM "Transmittal"
             WHERE "deletedAt" IS NULL
               AND "status" = ${TransmittalStatus.ReadyToSend}::"TransmittalStatus") AS transmittals,
          (SELECT count(*) FROM "MdrDocument"
             WHERE "deletedAt" IS NULL
               AND "currentClientReplyState" = ${ClientReplyState.WaitingClientReply}::"ClientReplyState") AS replies,
          (SELECT count(*) FROM "DocumentRevision"
             WHERE "deletedAt" IS NULL AND "isCurrent" = true
               AND "workflowStatus" IN (${WorkflowStatus.PendingReview}::"WorkflowStatus",
                                        ${WorkflowStatus.PendingApproval}::"WorkflowStatus",
                                        ${WorkflowStatus.ReadyForDcCheck}::"WorkflowStatus")) AS tasks,
          (SELECT count(*) FROM "DocumentRevision"
             WHERE "deletedAt" IS NULL AND "isCurrent" = true
               AND "workflowStatus" = ${WorkflowStatus.SubmittedToClient}::"WorkflowStatus") AS submitted,
          (SELECT count(*) FROM "DocumentRevision"
             WHERE "deletedAt" IS NULL AND "isCurrent" = true) AS revisions
      `,
      prisma.project.findMany({
        where: { deletedAt: null },
        orderBy: [{ code: "asc" }],
        take: 50,
        select: {
          id: true,
          code: true,
          name: true,
          client: { select: { name: true } },
        },
      }),
    ])

    const row = rawCounts[0] ?? {}
    const read = (key: string) => Number(row[key] ?? 0)

    const projects = read("projects")
    const pdi = canSeePdi ? read("pdi") : 0
    const mdr = canSeeMdr ? read("mdr") : 0
    const transmittals = canSeeTransmittals ? read("transmittals") : 0
    const replies = canSeeReplies ? read("replies") : 0
    const tasks = read("tasks")
    const submittedCount = read("submitted")
    const totalCount = read("revisions")

    const projectRoleByProjectId = new Map(
      user.projectRoles.map((item) => [item.projectId, item.role.code])
    )

    return {
      counts: { projects, pdi, mdr, transmittals, replies, tasks },
      submission: {
        submittedCount,
        totalCount,
        percent:
          totalCount === 0
            ? 0
            : Math.round((submittedCount / totalCount) * 100),
      },
      projects: projectRows.map((project) => ({
        id: project.id,
        code: project.code,
        name: project.name,
        clientName: project.client.name,
        role: projectRoleByProjectId.get(project.id) ?? "",
      })),
    }
  }
)
