export type CommandTaskKind =
  | "Prepare"
  | "Review"
  | "Approve"
  | "DC check"
  | "Issue"

export type CommandTaskPriority = "High" | "Medium" | "Normal"

export type CommandWorkspaceTask = {
  id: string
  kind: CommandTaskKind
  actionLabel: string
  href: string
  priority: CommandTaskPriority
  attentionLabel: string
  whyAttention: string
  estimatedEffort: string
  updatedLabel: string
  workflowStatus: string
  workflowStepIndex: number
  readiness: {
    ready: boolean
    label: string
    detail: string
  }
  project: {
    id: string
    code: string
    name: string
    clientName: string
  }
  document: {
    id: string
    number: string
    title: string
    disciplineCode: string
    disciplineName: string
    typeName: string
  }
  revisionLabel: string
  history: Array<{
    label: string
    actor: string
    occurredAt: string
  }>
}

export type CommandProjectOption = {
  id: string
  code: string
  name: string
  clientName: string
  myTaskCount: number
}

export type CommandProjectStage = {
  key: string
  label: string
  count: number
  state: string
  href: string | null
}

export type CommandWorkspaceOverview = {
  user: {
    fullName: string
    roleLabel: string
  }
  projects: CommandProjectOption[]
  selectedProject: CommandProjectOption | null
  projectStages: CommandProjectStage[]
  tasks: CommandWorkspaceTask[]
  nextTask: CommandWorkspaceTask | null
  attention: {
    highPriority: number
    readyNow: number
    decisions: number
    awaitingClient: number
  }
}
