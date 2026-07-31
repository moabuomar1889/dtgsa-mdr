
export const CLIENT_RESPONSE_OUTCOMES = [
  "REJECTED",
  "REJECTED_WITH_COMMENTS",
  "CONDITIONALLY_APPROVED",
  "APPROVED_WITH_COMMENTS",
  "REVISION_REQUIRED",
  "FINAL_APPROVED",
  "INFORMATION_ONLY",
  "HOLD",
  "CANCELLED",
  "CUSTOM",
] as const

export type ClientResponseOutcome = (typeof CLIENT_RESPONSE_OUTCOMES)[number]

export const CLIENT_RESPONSE_FILE_KINDS = [
  "FULL_DOCUMENT",
  "COVER_ONLY",
  "COMMENT_SHEET",
  "APPROVAL_LETTER",
  "RESPONSE_FORM",
  "TRANSMITTAL",
  "OTHER",
] as const

export type ClientResponseFileKind = (typeof CLIENT_RESPONSE_FILE_KINDS)[number]

export type ClientResponseEffects = {
  outcomeClass: ClientResponseOutcome
  countsAsApproved: boolean
  finalApproval: boolean
  rectificationRequired: boolean
  newRevisionRequired: boolean
  internalReapprovalRequired: boolean
  resubmissionRequired: boolean
  temporaryUseAllowed: boolean
  closureAllowed: boolean
  newDocumentNumberRequired: boolean
  returnedFileRequired: boolean
  expectedFileKind?: ClientResponseFileKind
}

export type ResponseCodeDefinition = {
  externalCode: string
  exactWording: string
  internalLabel: string
  displayOrder: number
  effects: ClientResponseEffects
}

export type ResponseCodeFixture = {
  code: string
  name: string
  codes: ResponseCodeDefinition[]
}

const noEffects = (
  outcomeClass: ClientResponseOutcome,
  overrides: Partial<ClientResponseEffects> = {}
): ClientResponseEffects => ({
  outcomeClass,
  countsAsApproved: false,
  finalApproval: false,
  rectificationRequired: false,
  newRevisionRequired: false,
  internalReapprovalRequired: false,
  resubmissionRequired: false,
  temporaryUseAllowed: false,
  closureAllowed: false,
  newDocumentNumberRequired: false,
  returnedFileRequired: true,
  ...overrides,
})

export const AIR_PRODUCTS_RESPONSE_FIXTURE: ResponseCodeFixture = {
  code: "AIR_PRODUCTS_DEV",
  name: "Air Products-style development fixture",
  codes: [
    {
      externalCode: "1",
      exactWording: "Rejected - Resubmit",
      internalLabel: "Rejected",
      displayOrder: 1,
      effects: noEffects("REJECTED", {
        rectificationRequired: true,
        newRevisionRequired: true,
        internalReapprovalRequired: true,
        resubmissionRequired: true,
        expectedFileKind: "FULL_DOCUMENT",
      }),
    },
    {
      externalCode: "2",
      exactWording: "Comments as Noted - Resubmit",
      internalLabel: "Conditionally approved with rectification",
      displayOrder: 2,
      effects: noEffects("CONDITIONALLY_APPROVED", {
        countsAsApproved: true,
        rectificationRequired: true,
        newRevisionRequired: true,
        internalReapprovalRequired: true,
        resubmissionRequired: true,
        temporaryUseAllowed: true,
        expectedFileKind: "COMMENT_SHEET",
      }),
    },
    {
      externalCode: "4",
      exactWording: "No Comments - No Further Submittal Unless Revised",
      internalLabel: "Final approved",
      displayOrder: 3,
      effects: noEffects("FINAL_APPROVED", {
        countsAsApproved: true,
        finalApproval: true,
        closureAllowed: true,
        expectedFileKind: "COVER_ONLY",
      }),
    },
    {
      externalCode: "5",
      exactWording: "Accepted for Information",
      internalLabel: "Information only",
      displayOrder: 4,
      effects: noEffects("INFORMATION_ONLY", {
        countsAsApproved: true,
        closureAllowed: true,
        expectedFileKind: "APPROVAL_LETTER",
      }),
    },
  ],
}

export const JIGPC_RESPONSE_FIXTURE: ResponseCodeFixture = {
  code: "JIGPC_DEV",
  name: "JIGPC-style development fixture",
  codes: [
    ["1", "Rejected", "REJECTED"],
    ["2", "Rejected with Comments", "REJECTED_WITH_COMMENTS"],
    ["3", "Comments as Noted", "APPROVED_WITH_COMMENTS"],
    ["4", "No Comments", "FINAL_APPROVED"],
    ["5", "Information Only", "INFORMATION_ONLY"],
  ].map(([externalCode, wording, outcome], index) => ({
    externalCode,
    exactWording: wording,
    internalLabel: wording,
    displayOrder: index + 1,
    effects: noEffects(outcome as ClientResponseOutcome, {
      countsAsApproved: ["APPROVED_WITH_COMMENTS", "FINAL_APPROVED"].includes(
        outcome
      ),
      finalApproval: outcome === "FINAL_APPROVED",
      closureAllowed: outcome === "FINAL_APPROVED",
      rectificationRequired: [
        "REJECTED",
        "REJECTED_WITH_COMMENTS",
        "APPROVED_WITH_COMMENTS",
      ].includes(outcome),
      newRevisionRequired: [
        "REJECTED",
        "REJECTED_WITH_COMMENTS",
        "APPROVED_WITH_COMMENTS",
      ].includes(outcome),
      resubmissionRequired: [
        "REJECTED",
        "REJECTED_WITH_COMMENTS",
        "APPROVED_WITH_COMMENTS",
      ].includes(outcome),
    }),
  })),
}

export const CONDITIONAL_CODE_2_FIXTURE: ResponseCodeFixture = {
  code: "CONDITIONAL_CODE_2_DEV",
  name: "Project conditional Code 2 fixture",
  codes: [
    {
      externalCode: "2",
      exactWording: "Conditionally approved - rectify and resubmit",
      internalLabel: "Conditional approval",
      displayOrder: 1,
      effects: noEffects("CONDITIONALLY_APPROVED", {
        countsAsApproved: true,
        rectificationRequired: true,
        newRevisionRequired: true,
        internalReapprovalRequired: true,
        resubmissionRequired: true,
        temporaryUseAllowed: true,
        expectedFileKind: "COMMENT_SHEET",
      }),
    },
  ],
}

export function validateResponseCodeDefinitions(
  codes: ResponseCodeDefinition[]
) {
  const errors: string[] = []
  const normalized = new Set<string>()
  if (codes.length === 0) errors.push("At least one response code is required.")
  for (const code of codes) {
    const externalCode = code.externalCode.trim()
    if (!externalCode) errors.push("External code is required.")
    if (!code.exactWording.trim()) {
      errors.push(`Exact wording is required for ${externalCode || "a code"}.`)
    }
    if (!code.internalLabel.trim()) {
      errors.push(`Internal label is required for ${externalCode || "a code"}.`)
    }
    const key = externalCode.toLocaleLowerCase()
    if (normalized.has(key)) {
      errors.push(`Duplicate external code: ${externalCode}.`)
    }
    normalized.add(key)
    errors.push(
      ...validateEffects(code.effects).map(
        (error) => `${externalCode}: ${error}`
      )
    )
  }
  return errors
}

export function validateEffects(effects: ClientResponseEffects) {
  const errors: string[] = []
  if (
    ["REJECTED", "REJECTED_WITH_COMMENTS"].includes(effects.outcomeClass) &&
    effects.countsAsApproved
  ) {
    errors.push("Rejected outcomes cannot count as approved.")
  }
  if (effects.finalApproval && !effects.countsAsApproved) {
    errors.push("Final approval must count as approved.")
  }
  if (effects.finalApproval && !effects.closureAllowed) {
    errors.push("Final approval must explicitly allow closure.")
  }
  if (effects.newDocumentNumberRequired && !effects.newRevisionRequired) {
    errors.push("A new document number requires a new revision path.")
  }
  return errors
}

// Pure and browser-safe. The hash lives in `./server` so that importing this
// module from a client component does not drag `node:crypto` — and with it a
// Buffer polyfill — into the browser bundle.
export function responsePolicyContent(input: {
  codeSetId: string
  versionId: string
  version: number
  code: ResponseCodeDefinition
}) {
  return {
    schemaVersion: "1",
    codeSetId: input.codeSetId,
    versionId: input.versionId,
    version: input.version,
    externalCode: input.code.externalCode,
    exactWording: input.code.exactWording,
    internalLabel: input.code.internalLabel,
    effects: sortJson(input.code.effects),
  }
}

export function deriveRevisionDirective(effects: ClientResponseEffects) {
  if (effects.newDocumentNumberRequired) return "NEW_DOCUMENT_NUMBER" as const
  if (effects.newRevisionRequired) return "NEW_REVISION" as const
  return "NO_REVISION" as const
}

export function canCloseFromResponse(effects: ClientResponseEffects) {
  return effects.finalApproval && effects.closureAllowed
}

export function buildClientResponseAssemblyProfile(input: {
  fileKind: ClientResponseFileKind
  primaryResponseFileId: string
  submittedMainFileId: string
  statusCoverFileId?: string
  attachmentFileIds?: string[]
}) {
  const attachments = input.attachmentFileIds ?? []
  switch (input.fileKind) {
    case "FULL_DOCUMENT":
      return {
        label: "Client Response",
        componentFileIds: [
          ...(input.statusCoverFileId ? [input.statusCoverFileId] : []),
          input.primaryResponseFileId,
          ...attachments,
        ],
      }
    case "COVER_ONLY":
      return {
        label: "Client Response",
        componentFileIds: [
          input.primaryResponseFileId,
          input.submittedMainFileId,
          ...attachments,
        ],
      }
    case "COMMENT_SHEET":
      return {
        label: "Client Response",
        componentFileIds: [
          ...(input.statusCoverFileId ? [input.statusCoverFileId] : []),
          input.primaryResponseFileId,
          input.submittedMainFileId,
          ...attachments,
        ],
      }
    case "APPROVAL_LETTER":
    case "RESPONSE_FORM":
    case "TRANSMITTAL":
    case "OTHER":
      return {
        label: "Client Response",
        componentFileIds: [
          input.primaryResponseFileId,
          input.submittedMainFileId,
          ...attachments,
        ],
      }
  }
}

export function nextRevisionLabel(current: string) {
  if (/^\d+$/.test(current)) {
    return String(Number(current) + 1).padStart(current.length, "0")
  }
  if (/^[A-Z]$/i.test(current)) {
    return String.fromCharCode(current.toUpperCase().charCodeAt(0) + 1)
  }
  const match = current.match(/^(.*?)(\d+)$/)
  if (match) {
    return `${match[1]}${String(Number(match[2]) + 1).padStart(match[2].length, "0")}`
  }
  return `${current}-1`
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJson(child)])
    )
  }
  return value
}
