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

export async function getProjectDashboard(
  user: CurrentAppUser,
  projectId: string
) {
  assertUserHasAnyPermission(user, PERMISSIONS.dashboardView, projectId)

  const accessibleProjectIds = await resolveAccessibleProjectIds(user)

  if (!accessibleProjectIds.includes(projectId)) {
    throw new Error("You do not have access to this project dashboard.")
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    include: {
      client: {
        select: {
          code: true,
          name: true,
        },
      },
      mdrDocuments: {
        where: {
          deletedAt: null,
        },
        include: {
          discipline: {
            select: {
              code: true,
              name: true,
            },
          },
          currentRevision: true,
        },
      },
      transmittals: {
        where: {
          deletedAt: null,
        },
        orderBy: [{ createdAt: "desc" }],
        take: 8,
      },
      clientReplies: {
        where: {
          deletedAt: null,
        },
        orderBy: [{ replyDate: "desc" }],
        take: 8,
        include: {
          reviewCode: {
            select: {
              code: true,
              label: true,
            },
          },
          document: {
            select: {
              dtgsaDocumentNumber: true,
              title: true,
            },
          },
        },
      },
    },
  })

  if (!project || project.deletedAt) {
    throw new Error("The requested project could not be found.")
  }

  const revisions = project.mdrDocuments
    .map((document) => document.currentRevision)
    .filter((revision) => Boolean(revision))

  const disciplineRows = Array.from(
    project.mdrDocuments.reduce((map, document) => {
      const key = document.discipline.code
      const current = map.get(key) ?? {
        discipline: `${document.discipline.code} - ${document.discipline.name}`,
        documents: 0,
        readyToSubmit: 0,
        submitted: 0,
      }
      current.documents += 1
      if (document.currentRevision?.workflowStatus === WorkflowStatus.ReadyToSubmit) {
        current.readyToSubmit += 1
      }
      if (document.currentRevision?.workflowStatus === WorkflowStatus.SubmittedToClient) {
        current.submitted += 1
      }
      map.set(key, current)
      return map
    }, new Map<string, { discipline: string; documents: number; readyToSubmit: number; submitted: number }>())
  ).map(([, value]) => value)

  const workflowBreakdown = Object.values(WorkflowStatus)
    .map((status) => ({
      label: status,
      count: revisions.filter((revision) => revision?.workflowStatus === status).length,
    }))
    .filter((entry) => entry.count > 0)

  const replyBreakdown = Object.values(ClientReplyState)
    .map((state) => ({
      label: state,
      count: project.clientReplies.filter((reply) => reply.replyState === state).length,
    }))
    .filter((entry) => entry.count > 0)

  return {
    project,
    counts: {
      totalDocuments: project.mdrDocuments.length,
      readyToSubmit: revisions.filter(
        (revision) => revision?.workflowStatus === WorkflowStatus.ReadyToSubmit
      ).length,
      submitted: revisions.filter(
        (revision) => revision?.workflowStatus === WorkflowStatus.SubmittedToClient
      ).length,
      revisions: revisions.length,
      transmittals: project.transmittals.length,
      sentTransmittals: project.transmittals.filter(
        (transmittal) => transmittal.status === TransmittalStatus.Sent
      ).length,
      replies: project.clientReplies.length,
    },
    disciplineRows,
    workflowBreakdown,
    replyBreakdown,
  }
}
