import { ClientReplyState, ScopeLevel } from "@prisma/client"

export function resolveReplyState(input: {
  requiresResubmittal: boolean
  finalizesDocument: boolean
  informationalOnly: boolean
}) {
  if (input.finalizesDocument) {
    return ClientReplyState.NoFurtherSubmittal
  }

  if (input.informationalOnly) {
    return ClientReplyState.InformationOnly
  }

  if (input.requiresResubmittal) {
    return ClientReplyState.RevisionRequired
  }

  return ClientReplyState.ReplyReceived
}

export function getNextRevisionLabel(currentLabel: string) {
  if (/^\d+$/.test(currentLabel)) {
    return String(Number(currentLabel) + 1).padStart(currentLabel.length, "0")
  }

  if (/^[A-Z]$/.test(currentLabel)) {
    return String.fromCharCode(currentLabel.charCodeAt(0) + 1)
  }

  const match = currentLabel.match(/^(.*?)(\d+)$/)

  if (match) {
    return `${match[1]}${String(Number(match[2]) + 1).padStart(match[2].length, "0")}`
  }

  return `${currentLabel}-1`
}

function sanitizeFileNameSegment(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-").replace(/\s+/g, "_")
}

export function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-")
    .replace(/\s+/g, "_")
}

export function resolveRejectedIdentifier(input: {
  strategy?: string | null
  dtgsaDocumentNumber: string
  clientDocumentNumber: string | null
}) {
  if (
    input.strategy === "CLIENT_DOCUMENT_NUMBER" &&
    input.clientDocumentNumber?.trim()
  ) {
    return sanitizeFileNameSegment(input.clientDocumentNumber.trim())
  }

  return sanitizeFileNameSegment(input.dtgsaDocumentNumber)
}

export function buildApplicableReviewCodes(
  projectId: string,
  clientId: string,
  codes: Array<{
    id: string
    code: string
    label: string
    description: string | null
    displayOrder: number
    requiresResubmittal: boolean
    finalizesDocument: boolean
    informationalOnly: boolean
    projectId: string | null
    clientId: string | null
    scopeLevel: ScopeLevel
  }>
) {
  const deduped = new Map<
    string,
    (typeof codes)[number] & {
      specificity: number
    }
  >()

  for (const code of codes) {
    let specificity = 0

    if (code.projectId === projectId) {
      specificity = 3
    } else if (code.clientId === clientId) {
      specificity = 2
    } else if (
      code.scopeLevel === ScopeLevel.Global &&
      !code.projectId &&
      !code.clientId
    ) {
      specificity = 1
    } else {
      continue
    }

    const existing = deduped.get(code.code)

    if (!existing || existing.specificity < specificity) {
      deduped.set(code.code, {
        ...code,
        specificity,
      })
    }
  }

  return Array.from(deduped.values())
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((item) => ({
      id: item.id,
      code: item.code,
      label: item.label,
      description: item.description,
      displayOrder: item.displayOrder,
      requiresResubmittal: item.requiresResubmittal,
      finalizesDocument: item.finalizesDocument,
      informationalOnly: item.informationalOnly,
      projectId: item.projectId,
      clientId: item.clientId,
      scopeLevel: item.scopeLevel,
    }))
}
