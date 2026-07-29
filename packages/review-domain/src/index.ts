export const REVIEW_SESSION_TTL_MS = 30 * 60 * 1000
export const FIRST_PAGE_RANGE_BYTES = 1024 * 1024

export type ApprovalInboxState =
  | "ACTIVE"
  | "UPCOMING"
  | "RETURNED"
  | "CLARIFICATION"
  | "COMPLETED"
  | "DELEGATED"
  | "OVERDUE"

export type ApprovalInboxItem = {
  id: string
  projectId: string
  clientId: string
  documentNumber: string
  title: string
  revision: string
  requiredRole: string
  stepLabel: string
  status: string
  dueAt?: Date | null
  completedAt?: Date | null
  delegated?: boolean
  queryText?: string
}

export function classifyInboxItem(
  item: ApprovalInboxItem,
  now = new Date()
): ApprovalInboxState {
  if (item.completedAt || item.status === "Completed") return "COMPLETED"
  if (item.delegated) return "DELEGATED"
  if (item.dueAt && item.dueAt < now && item.status === "Active") {
    return "OVERDUE"
  }
  if (item.status === "Returned") return "RETURNED"
  if (item.status === "ClarificationRequested") return "CLARIFICATION"
  if (item.status === "Active") return "ACTIVE"
  return "UPCOMING"
}

export function filterInbox<T extends ApprovalInboxItem>(
  items: readonly T[],
  input: {
    allowedProjectIds: readonly string[]
    state?: ApprovalInboxState
    search?: string
    clientId?: string
    role?: string
    from?: Date
    to?: Date
  }
): T[] {
  const allowed = new Set(input.allowedProjectIds)
  const search = input.search?.trim().toLowerCase()
  return items.filter((item) => {
    if (!allowed.has(item.projectId)) return false
    if (input.state && classifyInboxItem(item) !== input.state) return false
    if (input.clientId && item.clientId !== input.clientId) return false
    if (input.role && item.requiredRole !== input.role) return false
    if (input.from && (!item.dueAt || item.dueAt < input.from)) return false
    if (input.to && (!item.dueAt || item.dueAt > input.to)) return false
    if (
      search &&
      ![
        item.documentNumber,
        item.title,
        item.revision,
        item.stepLabel,
        item.queryText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    ) {
      return false
    }
    return true
  })
}

export function firstPageRange(sizeBytes: number) {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
    throw new Error("PDF size is invalid.")
  }
  return {
    start: 0,
    end: Math.min(sizeBytes, FIRST_PAGE_RANGE_BYTES) - 1,
  }
}

export function virtualPageWindow(input: {
  page: number
  pageCount: number
  radius?: number
}) {
  const radius = input.radius ?? 2
  const start = Math.max(1, input.page - radius)
  const end = Math.min(input.pageCount, input.page + radius)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

export type ReviewEligibility = {
  userId: string
  packageHash: string
  completedAt: Date | null
  expiresAt: Date
  revokedAt?: Date | null
  declarationAcceptedAt: Date | null
}

export function assertReviewSession(
  review: ReviewEligibility,
  input: { actorUserId: string; currentPackageHash: string; now?: Date }
) {
  const now = input.now ?? new Date()
  if (review.userId !== input.actorUserId) {
    throw new Error("Review session belongs to another user.")
  }
  if (review.packageHash !== input.currentPackageHash) {
    throw new Error("Review session package is no longer current.")
  }
  if (review.revokedAt || review.expiresAt <= now) {
    throw new Error("Review session is expired or revoked.")
  }
  if (!review.completedAt || !review.declarationAcceptedAt) {
    throw new Error("Review and responsibility declaration are incomplete.")
  }
}

export type CommentLocation = {
  type: "GENERAL" | "PAGE" | "AREA" | "TEXT"
  pageNumber?: number
  x?: number
  y?: number
  width?: number
  height?: number
  selectedText?: string
}

export function validateCommentLocation(location: CommentLocation) {
  if (location.type === "GENERAL") return location
  if (!location.pageNumber || location.pageNumber < 1) {
    throw new Error("A page comment requires a valid page number.")
  }
  if (location.type === "AREA") {
    const values = [location.x, location.y, location.width, location.height]
    if (
      values.some((value) => value === undefined || !Number.isFinite(value)) ||
      location.x! < 0 ||
      location.y! < 0 ||
      location.width! <= 0 ||
      location.height! <= 0 ||
      location.x! + location.width! > 1 ||
      location.y! + location.height! > 1
    ) {
      throw new Error("Area coordinates must be relative and inside the page.")
    }
  }
  if (location.type === "TEXT" && !location.selectedText?.trim()) {
    throw new Error("Text comments require selected text.")
  }
  return location
}

export type CommentState =
  | "Open"
  | "Resolved"
  | "Verified"
  | "Closed"
  | "Reopened"

export function assertCommentTransition(input: {
  from: CommentState
  to: CommentState
  blocking: boolean
  actorUserId: string
  authorUserId: string
  assigneeIds: readonly string[]
}) {
  const allowed: Record<CommentState, readonly CommentState[]> = {
    Open: ["Resolved"],
    Resolved: ["Verified", "Reopened"],
    Verified: ["Closed", "Reopened"],
    Closed: ["Reopened"],
    Reopened: ["Resolved"],
  }
  if (!allowed[input.from].includes(input.to)) {
    throw new Error("Comment state transition is not allowed.")
  }
  if (
    input.blocking &&
    ["Verified", "Closed"].includes(input.to) &&
    input.assigneeIds.includes(input.actorUserId)
  ) {
    throw new Error(
      "Responsible assignees cannot verify or close blocking comments."
    )
  }
  if (input.to === "Verified" && input.actorUserId === input.authorUserId) {
    throw new Error("Comment authors cannot self-verify closure.")
  }
}

export function validateReturnRequest(input: {
  reason?: string
  responsibleDepartment?: string
  blockingCommentIds: readonly string[]
  dueAt?: Date
  confirmed: boolean
  now?: Date
}) {
  if (!input.reason?.trim()) throw new Error("Return reason is required.")
  if (!input.responsibleDepartment?.trim()) {
    throw new Error("Responsible department is required.")
  }
  if (input.blockingCommentIds.length === 0) {
    throw new Error("Return requires at least one blocking comment.")
  }
  if (!input.dueAt || input.dueAt <= (input.now ?? new Date())) {
    throw new Error("Return due date must be in the future.")
  }
  if (!input.confirmed) throw new Error("Return confirmation is required.")
  return input
}

export function clampActiveSeconds(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return 0
  return Math.min(300, Math.floor(seconds))
}
