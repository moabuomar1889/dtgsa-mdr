import "server-only"
import {
  ClientReplyState,
  TransmittalStatus,
  WorkflowStatus,
} from "@prisma/client"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import { resolveAccessibleProjectIds } from "@/server/services/auth/access-scope"
import { assertUserHasAnyPermission } from "@/server/services/auth/permission-service"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

type CountSummary = {
  label: string
  count: number
}

function sortCounts(items: CountSummary[]) {
  return items.sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
}

export async function getReportingOverview(user: CurrentAppUser) {
  assertUserHasAnyPermission(user, PERMISSIONS.dashboardView)

  const accessibleProjectIds = await resolveAccessibleProjectIds(user)

  if (accessibleProjectIds.length === 0) {
    return {
      counts: {
        projects: 0,
        currentRevisions: 0,
        transmittals: 0,
        replies: 0,
      },
      projectRows: [],
      workflowBreakdown: [],
      replyBreakdown: [],
      disciplineBreakdown: [],
      overdueRows: [],
    }
  }

  const [projects, revisions, transmittals, replies] = await Promise.all([
    prisma.project.findMany({
      where: {
        id: {
          in: accessibleProjectIds,
        },
        deletedAt: null,
      },
      include: {
        client: {
          select: {
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            pdiItems: true,
            mdrDocuments: true,
            transmittals: true,
            clientReplies: true,
          },
        },
      },
      orderBy: [{ code: "asc" }],
    }),
    prisma.documentRevision.findMany({
      where: {
        deletedAt: null,
        isCurrent: true,
        document: {
          projectId: {
            in: accessibleProjectIds,
          },
          deletedAt: null,
        },
      },
      include: {
        document: {
          select: {
            projectId: true,
            project: {
              select: {
                code: true,
              },
            },
            discipline: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.transmittal.findMany({
      where: {
        deletedAt: null,
        projectId: {
          in: accessibleProjectIds,
        },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.clientReply.findMany({
      where: {
        deletedAt: null,
        projectId: {
          in: accessibleProjectIds,
        },
      },
      orderBy: [{ replyDate: "desc" }],
      include: {
        document: {
          select: {
            dtgsaDocumentNumber: true,
            title: true,
          },
        },
        project: {
          select: {
            code: true,
            name: true,
          },
        },
        reviewCode: {
          select: {
            code: true,
            label: true,
          },
        },
      },
    }),
  ])

  const workflowBreakdown = sortCounts(
    Object.values(WorkflowStatus).map((status) => ({
      label: status,
      count: revisions.filter((revision) => revision.workflowStatus === status).length,
    })).filter((item) => item.count > 0)
  )

  const replyBreakdown = sortCounts(
    Object.values(ClientReplyState).map((status) => ({
      label: status,
      count: replies.filter((reply) => reply.replyState === status).length,
    })).filter((item) => item.count > 0)
  )

  const disciplineBreakdown = sortCounts(
    Array.from(
      revisions.reduce((map, revision) => {
        const key = revision.document.discipline.code
        const current = map.get(key) ?? {
          label: `${revision.document.discipline.code} - ${revision.document.discipline.name}`,
          count: 0,
        }
        current.count += 1
        map.set(key, current)
        return map
      }, new Map<string, CountSummary>())
    ).map(([, value]) => value)
  )

  const projectRows = projects.map((project) => {
    const projectRevisions = revisions.filter(
      (revision) => revision.document.projectId === project.id
    )
    const projectTransmittals = transmittals.filter(
      (transmittal) => transmittal.projectId === project.id
    )
    const projectReplies = replies.filter((reply) => reply.projectId === project.id)

    return {
      id: project.id,
      code: project.code,
      name: project.name,
      clientName: `${project.client.code} - ${project.client.name}`,
      pdiItems: project._count.pdiItems,
      mdrDocuments: project._count.mdrDocuments,
      currentRevisions: projectRevisions.length,
      readyToSubmit: projectRevisions.filter(
        (revision) => revision.workflowStatus === WorkflowStatus.ReadyToSubmit
      ).length,
      submitted: projectRevisions.filter(
        (revision) => revision.workflowStatus === WorkflowStatus.SubmittedToClient
      ).length,
      replies: projectReplies.length,
      sentTransmittals: projectTransmittals.filter(
        (transmittal) => transmittal.status === TransmittalStatus.Sent
      ).length,
    }
  })

  const overdueRows = [
    ...revisions
      .filter(
        (revision) =>
          revision.workflowStatus === WorkflowStatus.PendingReview ||
          revision.workflowStatus === WorkflowStatus.PendingApproval ||
          revision.workflowStatus === WorkflowStatus.ReadyForDcCheck
      )
      .slice(0, 8)
      .map((revision) => ({
        category: "Workflow",
        label: `${revision.document.discipline.code} / ${revision.workflowStatus}`,
        detail: `${revision.document.project.code} / Rev ${revision.revisionLabel}`,
        date: revision.updatedAt,
      })),
    ...transmittals
      .filter(
        (transmittal) =>
          transmittal.status !== TransmittalStatus.Sent &&
          Boolean(transmittal.respondByDate) &&
          (transmittal.respondByDate as Date) < new Date()
      )
      .slice(0, 8)
      .map((transmittal) => ({
        category: "Transmittal",
        label: transmittal.transmittalNumber,
        detail: transmittal.subject,
        date: transmittal.respondByDate as Date,
      })),
  ]
    .sort((left, right) => left.date.getTime() - right.date.getTime())
    .slice(0, 10)

  return {
    counts: {
      projects: projects.length,
      currentRevisions: revisions.length,
      transmittals: transmittals.length,
      replies: replies.length,
    },
    projectRows,
    workflowBreakdown,
    replyBreakdown,
    disciplineBreakdown,
    overdueRows,
  }
}
