import { createHash } from "node:crypto"

export const COVER_SCHEMA_VERSION = "1"
export const COVER_RENDERER_VERSION = "pdf-engine-1"

export const COVER_ELEMENT_TYPES = [
  "STATIC_TEXT",
  "BOUND_TEXT",
  "IMAGE",
  "LINE",
  "RECTANGLE",
  "TABLE",
  "METADATA_BLOCK",
  "REVISION_TABLE",
  "QR_CODE",
  "VERIFICATION_CODE",
  "PACKAGE_HASH",
  "SIGNATURE_BOX",
  "CLIENT_RESPONSE_LEGEND",
  "CLIENT_REVIEWER",
  "CLIENT_SIGNATURE",
  "CLIENT_REVIEW_DATE",
  "CUSTOM_FIELD",
] as const

export type CoverElementType = (typeof COVER_ELEMENT_TYPES)[number]

export const COVER_BINDINGS = [
  "client.name",
  "project.name",
  "project.code",
  "document.number",
  "document.clientNumber",
  "document.vendorNumber",
  "document.title",
  "document.revision",
  "document.discipline",
  "document.type",
  "document.releasePurpose",
  "document.date",
  "document.pageCount",
  "document.status",
  "workflow.preparedBy",
  "workflow.reviewer",
  "workflow.approver",
  "workflow.additionalManagers",
  "workflow.dcValidator",
  "signer.name",
  "signer.signature",
  "signer.jobTitle",
  "signer.department",
  "signer.signedAt",
  "client.responseCode",
  "client.reviewer",
  "client.responseDate",
  "verification.code",
  "verification.qr",
  "verification.packageHash",
] as const

export type CoverBinding = (typeof COVER_BINDINGS)[number]
export type PageSize = "A4" | "A3" | "CUSTOM"
export type Orientation = "PORTRAIT" | "LANDSCAPE"

export type CoverElement = {
  id: string
  type: CoverElementType
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  locked?: boolean
  binding?: CoverBinding
  text?: string
  workflowStepKey?: string
  roleLabel?: string
  specificAssignment?: string
  properties?: Record<string, string | number | boolean | null>
}

export type CoverTemplateDocument = {
  schemaVersion: "1"
  page: {
    size: PageSize
    orientation: Orientation
    customWidthPt?: number
    customHeightPt?: number
  }
  grid: { enabled: boolean; size: number; snapping: boolean }
  elements: CoverElement[]
}

export type CoverValidationIssue = {
  code: string
  elementId?: string
  message: string
}

const bindingSet = new Set<string>(COVER_BINDINGS)
const typeSet = new Set<string>(COVER_ELEMENT_TYPES)

export function pageDimensions(page: CoverTemplateDocument["page"]) {
  const base =
    page.size === "A4"
      ? { width: 595.28, height: 841.89 }
      : page.size === "A3"
        ? { width: 841.89, height: 1190.55 }
        : {
            width: page.customWidthPt ?? 0,
            height: page.customHeightPt ?? 0,
          }
  if (base.width < 72 || base.height < 72) {
    throw new Error("Custom page dimensions must be at least 72 points.")
  }
  return page.orientation === "LANDSCAPE"
    ? { width: base.height, height: base.width }
    : base
}

export function validateCoverTemplate(
  template: CoverTemplateDocument,
  options: { requirePreparedBy?: boolean } = {}
) {
  const issues: CoverValidationIssue[] = []
  if (template.schemaVersion !== COVER_SCHEMA_VERSION) {
    issues.push({
      code: "UNSUPPORTED_VERSION",
      message: "Unsupported schema version.",
    })
  }
  try {
    pageDimensions(template.page)
  } catch (error) {
    issues.push({
      code: "INVALID_PAGE",
      message: error instanceof Error ? error.message : "Invalid page.",
    })
  }
  const ids = new Set<string>()
  for (const element of template.elements) {
    if (ids.has(element.id)) {
      issues.push({
        code: "DUPLICATE_ELEMENT",
        elementId: element.id,
        message: "Element IDs must be unique.",
      })
    }
    ids.add(element.id)
    if (!typeSet.has(element.type)) {
      issues.push({
        code: "INVALID_ELEMENT",
        elementId: element.id,
        message: "Unsupported element type.",
      })
    }
    if (
      [element.x, element.y, element.width, element.height].some(
        (value) => !Number.isFinite(value)
      ) ||
      element.x < 0 ||
      element.y < 0 ||
      element.width <= 0 ||
      element.height <= 0 ||
      element.x + element.width > 1 ||
      element.y + element.height > 1
    ) {
      issues.push({
        code: "OUT_OF_BOUNDS",
        elementId: element.id,
        message: "Relative coordinates must remain inside the page.",
      })
    }
    if (element.binding && !bindingSet.has(element.binding)) {
      issues.push({
        code: "INVALID_BINDING",
        elementId: element.id,
        message: "Binding is not allowlisted.",
      })
    }
    if (
      element.type === "SIGNATURE_BOX" &&
      (!element.workflowStepKey || !element.roleLabel)
    ) {
      issues.push({
        code: "INVALID_SIGNATURE_BOX",
        elementId: element.id,
        message: "Signature boxes require workflow step and role label.",
      })
    }
  }
  if (
    options.requirePreparedBy !== false &&
    !template.elements.some(
      (element) =>
        element.type === "SIGNATURE_BOX" &&
        element.workflowStepKey === "prepared"
    )
  ) {
    issues.push({
      code: "MISSING_PREPARED_BY",
      message: "Prepared By Manager signature box is required.",
    })
  }
  return issues
}

export function stableCoverSnapshot(template: CoverTemplateDocument) {
  const normalized = {
    ...template,
    elements: [...template.elements]
      .map((element) => {
        if (!element.properties) return { ...element }
        return {
          ...element,
          properties: Object.fromEntries(
            Object.entries(element.properties).sort(([a], [b]) =>
              a.localeCompare(b)
            )
          ),
        }
      })
      .sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id)),
  }
  const stableJson = (value: unknown): string => {
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "boolean"
    ) {
      return JSON.stringify(value)
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new Error("Non-finite cover value.")
      return JSON.stringify(Object.is(value, -0) ? 0 : value)
    }
    if (Array.isArray(value)) {
      return `[${value.map(stableJson).join(",")}]`
    }
    if (typeof value === "object") {
      return `{${Object.entries(value)
        .filter(([, item]) => typeof item !== "undefined")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
        .join(",")}}`
    }
    throw new Error("Unsupported cover snapshot value.")
  }
  const json = stableJson(normalized)
  return {
    snapshot: normalized,
    contentHash: createHash("sha256").update(json).digest("hex"),
    canonicalJson: json,
  }
}

export type InheritanceCandidate = {
  templateId: string
  versionId: string
  scopeType:
    | "ORGANIZATION"
    | "CLIENT"
    | "PROJECT"
    | "DOCUMENT_TYPE"
    | "DISCIPLINE"
  scopeId?: string | null
  priority: number
  publishedAt: Date
}

const scopeRank = {
  ORGANIZATION: 0,
  CLIENT: 1,
  PROJECT: 2,
  DOCUMENT_TYPE: 3,
  DISCIPLINE: 4,
} as const

export function resolveCoverInheritance(
  candidates: InheritanceCandidate[],
  context: {
    clientId?: string
    projectId?: string
    documentTypeId?: string
    disciplineId?: string
  }
) {
  const expected: Record<string, string | undefined> = {
    CLIENT: context.clientId,
    PROJECT: context.projectId,
    DOCUMENT_TYPE: context.documentTypeId,
    DISCIPLINE: context.disciplineId,
  }
  return candidates
    .filter(
      (candidate) =>
        candidate.scopeType === "ORGANIZATION" ||
        expected[candidate.scopeType] === candidate.scopeId
    )
    .sort(
      (a, b) =>
        scopeRank[b.scopeType] - scopeRank[a.scopeType] ||
        b.priority - a.priority ||
        b.publishedAt.getTime() - a.publishedAt.getTime()
    )[0]
}

export function toAbsoluteLayout(template: CoverTemplateDocument) {
  const page = pageDimensions(template.page)
  return {
    page,
    elements: [...template.elements]
      .sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id))
      .map((element) => ({
        ...element,
        x: element.x * page.width,
        y: page.height - (element.y + element.height) * page.height,
        width: element.width * page.width,
        height: element.height * page.height,
      })),
  }
}

export function snapRelative(value: number, gridSize: number) {
  if (gridSize <= 0) return Math.max(0, Math.min(1, value))
  return Math.max(0, Math.min(1, Math.round(value / gridSize) * gridSize))
}

export function detectTextOverflow(
  text: string,
  widthPoints: number,
  heightPoints: number,
  fontSize = 10
) {
  const approximateCharactersPerLine = Math.max(
    1,
    Math.floor(widthPoints / (fontSize * 0.55))
  )
  const requiredLines = Math.ceil(text.length / approximateCharactersPerLine)
  const availableLines = Math.max(
    1,
    Math.floor(heightPoints / (fontSize * 1.25))
  )
  return requiredLines > availableLines
}

export function validateImageInput(input: {
  mimeType: string
  sizeBytes: number
  svgText?: string
}) {
  if (input.sizeBytes > 5 * 1024 * 1024) {
    throw new Error("Cover image exceeds the 5 MB limit.")
  }
  if (!["image/png", "image/jpeg", "image/svg+xml"].includes(input.mimeType)) {
    throw new Error("Only PNG, JPEG, and sanitized SVG images are supported.")
  }
  if (input.mimeType === "image/svg+xml") {
    const svg = input.svgText ?? ""
    if (/<script|<foreignObject|on\w+\s*=|javascript:|https?:\/\//i.test(svg)) {
      throw new Error("SVG contains active or external content.")
    }
  }
}

export type DesignerState = {
  present: CoverTemplateDocument
  past: CoverTemplateDocument[]
  future: CoverTemplateDocument[]
  selectedIds: string[]
}

export type DesignerAction =
  | { type: "SELECT"; ids: string[] }
  | { type: "SET_TEMPLATE"; template: CoverTemplateDocument }
  | { type: "ADD"; element: CoverElement }
  | { type: "UPDATE"; ids: string[]; changes: Partial<CoverElement> }
  | { type: "DELETE"; ids: string[] }
  | { type: "DUPLICATE"; ids: string[] }
  | { type: "UNDO" }
  | { type: "REDO" }

function commit(
  state: DesignerState,
  present: CoverTemplateDocument,
  selectedIds = state.selectedIds
): DesignerState {
  return {
    present,
    past: [...state.past, state.present].slice(-100),
    future: [],
    selectedIds,
  }
}

export function coverDesignerReducer(
  state: DesignerState,
  action: DesignerAction
): DesignerState {
  if (action.type === "SELECT") return { ...state, selectedIds: action.ids }
  if (action.type === "UNDO") {
    const previous = state.past.at(-1)
    if (!previous) return state
    return {
      present: previous,
      past: state.past.slice(0, -1),
      future: [state.present, ...state.future],
      selectedIds: [],
    }
  }
  if (action.type === "REDO") {
    const next = state.future[0]
    if (!next) return state
    return {
      present: next,
      past: [...state.past, state.present],
      future: state.future.slice(1),
      selectedIds: [],
    }
  }
  if (action.type === "SET_TEMPLATE") return commit(state, action.template, [])
  if (action.type === "ADD") {
    return commit(
      state,
      {
        ...state.present,
        elements: [...state.present.elements, action.element],
      },
      [action.element.id]
    )
  }
  if (action.type === "UPDATE") {
    const selected = new Set(action.ids)
    return commit(state, {
      ...state.present,
      elements: state.present.elements.map((element) =>
        selected.has(element.id) && !element.locked
          ? { ...element, ...action.changes }
          : element
      ),
    })
  }
  if (action.type === "DELETE") {
    const selected = new Set(action.ids)
    return commit(
      state,
      {
        ...state.present,
        elements: state.present.elements.filter(
          (element) => !selected.has(element.id) || element.locked
        ),
      },
      []
    )
  }
  const selected = new Set(action.ids)
  const duplicates = state.present.elements
    .filter((element) => selected.has(element.id))
    .map((element, index) => ({
      ...element,
      id: `${element.id}-copy-${index + 1}`,
      x: Math.min(1 - element.width, element.x + 0.02),
      y: Math.min(1 - element.height, element.y + 0.02),
      zIndex:
        Math.max(...state.present.elements.map((item) => item.zIndex), 0) +
        index +
        1,
      locked: false,
    }))
  return commit(
    state,
    { ...state.present, elements: [...state.present.elements, ...duplicates] },
    duplicates.map((element) => element.id)
  )
}

export const DEFAULT_COVER_TEMPLATE: CoverTemplateDocument = {
  schemaVersion: "1",
  page: { size: "A4", orientation: "PORTRAIT" },
  grid: { enabled: true, size: 0.01, snapping: true },
  elements: [
    {
      id: "document-title",
      type: "BOUND_TEXT",
      binding: "document.title",
      x: 0.08,
      y: 0.1,
      width: 0.84,
      height: 0.08,
      zIndex: 1,
      text: "Document title",
    },
    {
      id: "prepared-by",
      type: "SIGNATURE_BOX",
      workflowStepKey: "prepared",
      roleLabel: "Prepared By Manager",
      x: 0.08,
      y: 0.68,
      width: 0.4,
      height: 0.16,
      zIndex: 2,
    },
    {
      id: "verification",
      type: "QR_CODE",
      binding: "verification.qr",
      x: 0.78,
      y: 0.82,
      width: 0.14,
      height: 0.1,
      zIndex: 3,
    },
  ],
}
