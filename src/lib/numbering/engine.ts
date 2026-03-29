import {
  NumberingSequenceScope,
  NumberingTokenType,
  type NumberingRuleToken,
} from "@prisma/client"

export type NumberingContext = {
  clientCode?: string | null
  projectCode?: string | null
  projectId?: string | null
  disciplineCode?: string | null
  documentTypeCode?: string | null
  releasePurposeCode?: string | null
  revision?: string | null
  customScopeKey?: string | null
  customFields?: Record<string, string | null | undefined>
}

export type NumberingTokenInput = Pick<
  NumberingRuleToken,
  "key" | "order" | "padding" | "separator" | "tokenType" | "valueTemplate"
> & {
  isOptional?: boolean
}

type RenderDocumentNumberInput = {
  formatString?: string | null
  separator?: string | null
  padding?: number | null
  tokens: NumberingTokenInput[]
  sequenceValue: number
  context: NumberingContext
}

const PLACEHOLDER_PATTERN = /\{([A-Za-z0-9_]+)\}/g

function normalizeValue(value?: string | null) {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function formatSequenceValue(value: number, padding = 4) {
  return value.toString().padStart(padding, "0")
}

export function buildSequenceScopeKey(
  scope: NumberingSequenceScope,
  context: NumberingContext
) {
  const projectKey = context.projectId ?? context.projectCode
  const disciplineKey = context.disciplineCode
  const documentTypeKey = context.documentTypeCode

  switch (scope) {
    case NumberingSequenceScope.GLOBAL:
      return "GLOBAL"
    case NumberingSequenceScope.PER_PROJECT:
      if (!projectKey) {
        throw new Error("PER_PROJECT numbering requires a project scope key.")
      }
      return `PROJECT:${projectKey}`
    case NumberingSequenceScope.PER_DISCIPLINE:
      if (!projectKey || !disciplineKey) {
        throw new Error(
          "PER_DISCIPLINE numbering requires project and discipline context."
        )
      }
      return `PROJECT:${projectKey}|DISCIPLINE:${disciplineKey}`
    case NumberingSequenceScope.PER_DOC_TYPE:
      if (!projectKey || !documentTypeKey) {
        throw new Error(
          "PER_DOC_TYPE numbering requires project and document-type context."
        )
      }
      return `PROJECT:${projectKey}|DOC_TYPE:${documentTypeKey}`
    case NumberingSequenceScope.CUSTOM_KEY:
      if (!context.customScopeKey) {
        throw new Error("CUSTOM_KEY numbering requires customScopeKey.")
      }
      return context.customScopeKey
    default:
      return "GLOBAL"
  }
}

function resolveTokenValue(
  token: NumberingTokenInput,
  sequenceValue: number,
  defaultPadding: number,
  context: NumberingContext
) {
  switch (token.tokenType) {
    case NumberingTokenType.Literal:
      return normalizeValue(token.valueTemplate ?? token.key)
    case NumberingTokenType.ClientCode:
      return normalizeValue(context.clientCode)
    case NumberingTokenType.ProjectCode:
      return normalizeValue(context.projectCode)
    case NumberingTokenType.DisciplineCode:
      return normalizeValue(context.disciplineCode)
    case NumberingTokenType.DocumentTypeCode:
      return normalizeValue(context.documentTypeCode)
    case NumberingTokenType.ReleasePurposeCode:
      return normalizeValue(context.releasePurposeCode)
    case NumberingTokenType.Sequence:
      return formatSequenceValue(sequenceValue, token.padding ?? defaultPadding)
    case NumberingTokenType.Revision:
      return normalizeValue(context.revision)
    case NumberingTokenType.CustomField:
      return normalizeValue(
        context.customFields?.[token.key] ?? token.valueTemplate ?? undefined
      )
    default:
      return undefined
  }
}

function assertTokenValue(
  token: NumberingTokenInput,
  value: string | undefined,
  isOptional = false
) {
  if (!value && !isOptional) {
    throw new Error(`Missing required numbering token value for "${token.key}".`)
  }

  return value
}

function normalizeRenderedNumber(value: string, separator: string) {
  const escapedSeparator = escapeRegExp(separator)

  return value
    .replace(PLACEHOLDER_PATTERN, "")
    .replace(new RegExp(`${escapedSeparator}{2,}`, "g"), separator)
    .replace(new RegExp(`^${escapedSeparator}|${escapedSeparator}$`, "g"), "")
}

export function renderDocumentNumber({
  formatString,
  separator,
  padding,
  tokens,
  sequenceValue,
  context,
}: RenderDocumentNumberInput) {
  const resolvedSeparator = separator ?? "-"
  const resolvedPadding = padding ?? 4
  const orderedTokens = [...tokens].sort((left, right) => left.order - right.order)

  if (formatString && formatString.includes("{")) {
    let rendered = formatString

    for (const token of orderedTokens) {
      const tokenValue = assertTokenValue(
        token,
        resolveTokenValue(token, sequenceValue, resolvedPadding, context),
        token.isOptional
      )

      rendered = rendered.replaceAll(`{${token.key}}`, tokenValue ?? "")
    }

    return normalizeRenderedNumber(rendered, resolvedSeparator)
  }

  let rendered = ""

  for (const token of orderedTokens) {
    const tokenValue = assertTokenValue(
      token,
      resolveTokenValue(token, sequenceValue, resolvedPadding, context),
      token.isOptional
    )

    if (!tokenValue) {
      continue
    }

    if (!rendered) {
      rendered = tokenValue
      continue
    }

    rendered += `${token.separator ?? resolvedSeparator}${tokenValue}`
  }

  return normalizeRenderedNumber(rendered, resolvedSeparator)
}
