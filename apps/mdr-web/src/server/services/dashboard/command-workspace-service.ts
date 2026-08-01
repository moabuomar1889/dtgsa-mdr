import "server-only"

import {
  ClientReplyState,
  WorkflowActionType,
  WorkflowStatus,
} from "@prisma/client"
import {
  PERMISSIONS,
  hasAnyPermission,
  type PermissionCode,
} from "@/lib/permissions/rbac"
import { prisma } from "@/lib/prisma/client"
import { resolveAccessibleProjectIds } from "@/server/services/auth/access-scope"
import { assertUserHasAnyPermission } from "@/server/services/auth/permission-service"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import type {
  CommandProjectStage,
  CommandTaskKind,
  CommandTaskPriority,
  CommandWorkspaceOverview,
  CommandWorkspaceTask,
} from "@/features/dashboard/types"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

const PREPARATION_STATUSES = new Set<WorkflowStatus>([
  WorkflowStatus.Draft,
  WorkflowStatus.Uploaded,
  WorkflowStatus.ReviewRejected,
  WorkflowStatus.ApprovalRejected,
  WorkflowStatus.DcReturnedForCorrection,
])

const RETURNED_STATUSES = new Set<WorkflowStatus>([
  WorkflowStatus.ReviewRejected,
  WorkflowStatus.ApprovalRejected,
  WorkflowStatus.DcReturnedForCorrection,
])

const ACTIONABLE_STATUSES = [
  WorkflowStatus.Draft,
  WorkflowStatus.Uploaded,
  WorkflowStatus.ReviewRejected,
  WorkflowStatus.ApprovalRejected,
  WorkflowStatus.DcReturnedForCorrection,
  WorkflowStatus.PendingReview,
  WorkflowStatus.PendingApproval,
  WorkflowStatus.ReadyForDcCheck,
  WorkflowStatus.ReadyToSubmit,
] as const

const ACTION_HISTORY_LABELS: Record<WorkflowActionType, string> = {
  [WorkflowActionType.Created]: "Revision created",
  [WorkflowActionType.Uploaded]: "Source file uploaded",
  [WorkflowActionType.SubmittedForReview]: "Submitted for review",
  [WorkflowActionType.ReviewApproved]: "Review approved",
  [WorkflowActionType.ReviewRejected]: "Review returned",
  [WorkflowActionType.SubmittedForApproval]: "Submitted for approval",
  [WorkflowActionType.ApprovalApproved]: "Approval completed",
  [WorkflowActionType.ApprovalRejected]: "Approval returned",
  [WorkflowActionType.ReturnedForCorrection]: "Returned for correction",
  [WorkflowActionType.DcValidated]: "DC check completed",
  [WorkflowActionType.SubmittedToClient]: "Issued to client",
  [WorkflowActionType.ClientReplyRecorded]: "Client reply recorded",
  [WorkflowActionType.RevisionTriggered]: "New revision started",
  [WorkflowActionType.Locked]: "Revision locked",
  [WorkflowActionType.Unlocked]: "Revision unlocked",
}

function canPerform(
  user: CurrentAppUser,
  permission: PermissionCode,
  projectId: string
) {
  return hasAnyPermission({
    required: permission,
    systemRoles: user.userRoles.map((entry) => entry.role.code),
    projectRoles: user.projectRoles
      .filter((entry) => entry.projectId === projectId)
      .map((entry) => entry.role.code),
  })
}

function getTaskKind(
  user: CurrentAppUser,
  status: WorkflowStatus,
  projectId: string
): CommandTaskKind | null {
  if (
    PREPARATION_STATUSES.has(status) &&
    canPerform(user, PERMISSIONS.workflowPrepare, projectId)
  ) {
    return "Prepare"
  }
  if (
    status === WorkflowStatus.PendingReview &&
    canPerform(user, PERMISSIONS.workflowReview, projectId)
  ) {
    return "Review"
  }
  if (
    status === WorkflowStatus.PendingApproval &&
    canPerform(user, PERMISSIONS.workflowApprove, projectId)
  ) {
    return "Approve"
  }
  if (
    status === WorkflowStatus.ReadyForDcCheck &&
    canPerform(user, PERMISSIONS.dcCheck, projectId)
  ) {
    return "DC check"
  }
  if (
    status === WorkflowStatus.ReadyToSubmit &&
    canPerform(user, PERMISSIONS.transmittalsManage, projectId)
  ) {
    return "Issue"
  }
  return null
}

function getPriority(status: WorkflowStatus): CommandTaskPriority {
  if (RETURNED_STATUSES.has(status)) return "High"
  if (
    status === WorkflowStatus.PendingApproval ||
    status === WorkflowStatus.ReadyForDcCheck ||
    status === WorkflowStatus.ReadyToSubmit
  ) {
    return "Medium"
  }
  return "Normal"
}

function getAttentionLabel(status: WorkflowStatus) {
  if (RETURNED_STATUSES.has(status)) return "Returned"
  if (status === WorkflowStatus.ReadyToSubmit) return "Ready to issue"
  if (status === WorkflowStatus.ReadyForDcCheck) return "Ready for DC"
  if (status === WorkflowStatus.PendingApproval) return "Approval waiting"
  if (status === WorkflowStatus.PendingReview) return "Review waiting"
  return "Ready now"
}

function getWhyAttention(status: WorkflowStatus) {
  switch (status) {
    case WorkflowStatus.ReviewRejected:
      return "Review comments must be addressed before the document can move forward."
    case WorkflowStatus.ApprovalRejected:
      return "Approval comments require a corrected preparation package."
    case WorkflowStatus.DcReturnedForCorrection:
      return "Document Control returned this revision for correction."
    case WorkflowStatus.PendingReview:
      return "The preparation package is ready for discipline review."
    case WorkflowStatus.PendingApproval:
      return "The completed review is waiting for formal approval."
    case WorkflowStatus.ReadyForDcCheck:
      return "The approved package is ready for the final Document Control check."
    case WorkflowStatus.ReadyToSubmit:
      return "The controlled revision is complete and can be added to a transmittal."
    default:
      return "This revision is available for your role to prepare and move forward."
  }
}

function getEstimatedEffort(kind: CommandTaskKind) {
  switch (kind) {
    case "Prepare":
      return "15-20 min"
    case "Review":
      return "10-15 min"
    case "Approve":
      return "5-10 min"
    case "DC check":
      return "10-15 min"
    case "Issue":
      return "About 10 min"
  }
}

function getWorkflowStepIndex(status: WorkflowStatus) {
  if (PREPARATION_STATUSES.has(status)) return 0
  if (status === WorkflowStatus.PendingReview) return 1
  if (status === WorkflowStatus.PendingApproval) return 2
  if (status === WorkflowStatus.ReadyForDcCheck) return 3
  return 4
}

function getActionLabel(kind: CommandTaskKind) {
  switch (kind) {
    case "Prepare":
      return "Open & prepare"
    case "Review":
      return "Open & review"
    case "Approve":
      return "Open & approve"
    case "DC check":
      return "Open & check"
    case "Issue":
      return "Open & issue"
  }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value)
}

function sumProjectStatus(
  groups: Array<{
    projectId: string
    currentWorkflowStatus: WorkflowStatus
    currentClientReplyState: ClientReplyState
    _count: { _all: number }
  }>,
  projectId: string,
  statuses: readonly WorkflowStatus[]
) {
  const accepted = new Set(statuses)
  return groups
    .filter(
      (group) =>
        group.projectId === projectId &&
        accepted.has(group.currentWorkflowStatus)
    )
    .reduce((total, group) => total + group._count._all, 0)
}

export async function getCommandWorkspaceOverview(
  user: CurrentAppUser,
  requestedProjectId?: string
): Promise<CommandWorkspaceOverview> {
  assertUserHasAnyPermission(user, PERMISSIONS.dashboardView)

  const accessibleProjectIds = await resolveAccessibleProjectIds(user)
  if (accessibleProjectIds.length === 0) {
    return {
      user: {
        fullName: user.fullName,
        roleLabel:
          user.jobTitle ?? user.userRoles[0]?.role.name ?? "Project team",
      },
      projects: [],
      selectedProject: null,
      projectStages: [],
      tasks: [],
      nextTask: null,
      attention: {
        highPriority: 0,
        readyNow: 0,
        decisions: 0,
        awaitingClient: 0,
      },
    }
  }

  const [projectRows, revisionRows, documentGroups, pdiGroups] =
    await Promise.all([
      prisma.project.findMany({
        where: {
          id: { in: accessibleProjectIds },
          deletedAt: null,
          isActive: true,
        },
        orderBy: [{ code: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          client: { select: { name: true } },
        },
      }),
      prisma.documentRevision.findMany({
        where: {
          deletedAt: null,
          isCurrent: true,
          workflowStatus: { in: [...ACTIONABLE_STATUSES] },
          document: {
            deletedAt: null,
            projectId: { in: accessibleProjectIds },
          },
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 80,
        select: {
          id: true,
          revisionLabel: true,
          workflowStatus: true,
          createdAt: true,
          updatedAt: true,
          files: {
            where: { deletedAt: null },
            select: { id: true, type: true },
          },
          workflowActions: {
            orderBy: [{ createdAt: "desc" }],
            take: 3,
            select: {
              actionType: true,
              actorUserId: true,
              createdAt: true,
            },
          },
          document: {
            select: {
              id: true,
              projectId: true,
              dtgsaDocumentNumber: true,
              title: true,
              project: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  client: { select: { name: true } },
                },
              },
              discipline: { select: { code: true, name: true } },
              documentTypeCategory: { select: { name: true } },
            },
          },
        },
      }),
      prisma.mdrDocument.groupBy({
        by: ["projectId", "currentWorkflowStatus", "currentClientReplyState"],
        where: {
          projectId: { in: accessibleProjectIds },
          deletedAt: null,
        },
        _count: { _all: true },
      }),
      prisma.pdiItem.groupBy({
        by: ["projectId"],
        where: {
          projectId: { in: accessibleProjectIds },
          deletedAt: null,
        },
        _count: { _all: true },
      }),
    ])

  const tasks = revisionRows.flatMap((revision): CommandWorkspaceTask[] => {
    const kind = getTaskKind(
      user,
      revision.workflowStatus,
      revision.document.projectId
    )
    if (!kind) return []

    const hasSourceFile = revision.files.length > 0
    const ready = kind !== "Prepare" || hasSourceFile
    const href =
      kind === "Issue"
        ? "/transmittals"
        : `/mdr?revisionId=${encodeURIComponent(revision.id)}#revision-${revision.id}`

    const history = revision.workflowActions.map((action) => ({
      label: ACTION_HISTORY_LABELS[action.actionType],
      actor:
        action.actorUserId === user.id
          ? user.fullName
          : action.actorUserId
            ? "Project team"
            : "System workflow",
      occurredAt: formatDate(action.createdAt),
    }))

    if (history.length === 0) {
      history.push({
        label: "Revision created",
        actor: "System workflow",
        occurredAt: formatDate(revision.createdAt),
      })
    }

    return [
      {
        id: revision.id,
        kind,
        actionLabel: getActionLabel(kind),
        href,
        priority: getPriority(revision.workflowStatus),
        attentionLabel: getAttentionLabel(revision.workflowStatus),
        whyAttention: getWhyAttention(revision.workflowStatus),
        estimatedEffort: getEstimatedEffort(kind),
        updatedLabel: formatDate(revision.updatedAt),
        workflowStatus: revision.workflowStatus,
        workflowStepIndex: getWorkflowStepIndex(revision.workflowStatus),
        readiness: {
          ready,
          label: ready
            ? `Ready to ${kind.toLowerCase()}`
            : "Source file needed",
          detail: ready
            ? "Required workflow context is available."
            : "Upload the controlled source file before preparation.",
        },
        project: {
          id: revision.document.project.id,
          code: revision.document.project.code,
          name: revision.document.project.name,
          clientName: revision.document.project.client.name,
        },
        document: {
          id: revision.document.id,
          number: revision.document.dtgsaDocumentNumber,
          title: revision.document.title,
          disciplineCode: revision.document.discipline.code,
          disciplineName: revision.document.discipline.name,
          typeName: revision.document.documentTypeCategory?.name ?? "Document",
        },
        revisionLabel: revision.revisionLabel,
        history,
      },
    ]
  })

  const taskCountByProjectId = tasks.reduce((counts, task) => {
    counts.set(task.project.id, (counts.get(task.project.id) ?? 0) + 1)
    return counts
  }, new Map<string, number>())

  const projects = projectRows.map((project) => ({
    id: project.id,
    code: project.code,
    name: project.name,
    clientName: project.client.name,
    myTaskCount: taskCountByProjectId.get(project.id) ?? 0,
  }))

  const requestedProject = projects.find(
    (project) => project.id === requestedProjectId
  )
  const selectedProject =
    requestedProject ??
    projects.find((project) => project.id === tasks[0]?.project.id) ??
    projects[0] ??
    null

  const selectedProjectTasks = selectedProject
    ? tasks.filter((task) => task.project.id === selectedProject.id)
    : tasks
  const nextTask = selectedProjectTasks[0] ?? tasks[0] ?? null

  const pdiCount = selectedProject
    ? (pdiGroups.find((group) => group.projectId === selectedProject.id)?._count
        ._all ?? 0)
    : 0
  const selectedProjectId = selectedProject?.id ?? ""
  const projectModuleAccess = selectedProject
    ? {
        pdi:
          canPerform(user, PERMISSIONS.pdiManage, selectedProject.id) ||
          canPerform(user, PERMISSIONS.pdiCollaborate, selectedProject.id),
        mdr: canPerform(user, PERMISSIONS.mdrManage, selectedProject.id),
        prepare: canPerform(
          user,
          PERMISSIONS.workflowPrepare,
          selectedProject.id
        ),
        review: canPerform(
          user,
          PERMISSIONS.workflowReview,
          selectedProject.id
        ),
        approve: canPerform(
          user,
          PERMISSIONS.workflowApprove,
          selectedProject.id
        ),
        dc: canPerform(user, PERMISSIONS.dcCheck, selectedProject.id),
        issue: canPerform(
          user,
          PERMISSIONS.transmittalsManage,
          selectedProject.id
        ),
        reply: canPerform(
          user,
          PERMISSIONS.clientRepliesManage,
          selectedProject.id
        ),
      }
    : null
  const clientReplyCount = documentGroups
    .filter(
      (group) =>
        group.projectId === selectedProjectId &&
        group.currentClientReplyState === ClientReplyState.WaitingClientReply
    )
    .reduce((total, group) => total + group._count._all, 0)

  const projectStages: CommandProjectStage[] = selectedProject
    ? [
        {
          key: "pdi",
          label: "PDI",
          count: pdiCount,
          state: pdiCount > 0 ? "Register active" : "No entries",
          href: projectModuleAccess?.pdi ? "/pdi" : null,
        },
        {
          key: "prepare",
          label: "Prepare",
          count: sumProjectStatus(documentGroups, selectedProject.id, [
            ...PREPARATION_STATUSES,
          ]),
          state: "In progress",
          href:
            projectModuleAccess?.mdr || projectModuleAccess?.prepare
              ? "/mdr"
              : null,
        },
        {
          key: "review",
          label: "Review",
          count: sumProjectStatus(documentGroups, selectedProject.id, [
            WorkflowStatus.PendingReview,
          ]),
          state: "Action required",
          href:
            projectModuleAccess?.mdr || projectModuleAccess?.review
              ? "/mdr"
              : null,
        },
        {
          key: "approve",
          label: "Approve",
          count: sumProjectStatus(documentGroups, selectedProject.id, [
            WorkflowStatus.PendingApproval,
          ]),
          state: "Action required",
          href:
            projectModuleAccess?.mdr || projectModuleAccess?.approve
              ? "/mdr"
              : null,
        },
        {
          key: "dc",
          label: "DC check",
          count: sumProjectStatus(documentGroups, selectedProject.id, [
            WorkflowStatus.ReadyForDcCheck,
          ]),
          state: "Controlled check",
          href:
            projectModuleAccess?.mdr || projectModuleAccess?.dc ? "/mdr" : null,
        },
        {
          key: "issue",
          label: "Issue",
          count: sumProjectStatus(documentGroups, selectedProject.id, [
            WorkflowStatus.ReadyToSubmit,
          ]),
          state: "Ready to issue",
          href: projectModuleAccess?.issue ? "/transmittals" : null,
        },
        {
          key: "reply",
          label: "Client reply",
          count: clientReplyCount,
          state: "Awaiting reply",
          href: projectModuleAccess?.reply ? "/replies" : null,
        },
      ]
    : []

  const awaitingClient = documentGroups
    .filter(
      (group) =>
        group.currentClientReplyState === ClientReplyState.WaitingClientReply
    )
    .reduce((total, group) => total + group._count._all, 0)

  return {
    user: {
      fullName: user.fullName,
      roleLabel:
        user.jobTitle ?? user.userRoles[0]?.role.name ?? "Project team",
    },
    projects,
    selectedProject,
    projectStages,
    tasks,
    nextTask,
    attention: {
      highPriority: tasks.filter((task) => task.priority === "High").length,
      readyNow: tasks.filter((task) => task.readiness.ready).length,
      decisions: tasks.filter((task) =>
        ["Review", "Approve", "DC check"].includes(task.kind)
      ).length,
      awaitingClient,
    },
  }
}
