import "server-only"
import { ScopeLevel, type Prisma } from "@prisma/client"
import {
  buildSequenceScopeKey,
  renderDocumentNumber,
} from "@/lib/numbering/engine"

const GLOBAL_SCOPE_KEY = "system"

type DatabaseClient = Prisma.TransactionClient

type GenerateDocumentNumberInput = {
  db: DatabaseClient
  project: {
    id: string
    code: string
    client: {
      id: string
      code: string
    }
  }
  discipline: {
    id: string
    code: string
  }
  documentTypeCategory: {
    id: string
    code: string
  } | null
  releasePurpose: {
    id: string
    code: string
  } | null
  revision?: string | null
}

function buildCustomScopeKey(input: {
  projectId: string
  disciplineCode: string
  documentTypeCode: string
}) {
  return `PROJECT:${input.projectId}|DISCIPLINE:${input.disciplineCode}|DOC_TYPE:${input.documentTypeCode}`
}

async function resolveNumberingRule(
  db: DatabaseClient,
  projectId: string,
  clientId: string
) {
  const include = {
    tokens: {
      orderBy: [{ order: "asc" as const }],
    },
  }

  const projectRule = await db.numberingRule.findFirst({
    where: {
      projectId,
      isActive: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include,
  })

  if (projectRule) {
    return projectRule
  }

  const clientRule = await db.numberingRule.findFirst({
    where: {
      clientId,
      isActive: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include,
  })

  if (clientRule) {
    return clientRule
  }

  const globalRule = await db.numberingRule.findFirst({
    where: {
      scopeLevel: ScopeLevel.Global,
      scopeKey: GLOBAL_SCOPE_KEY,
      isActive: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include,
  })

  if (!globalRule) {
    throw new Error("No active numbering rule is available for this project.")
  }

  return globalRule
}

export async function generateDocumentNumber(
  input: GenerateDocumentNumberInput
) {
  if (!input.documentTypeCategory || !input.releasePurpose) {
    throw new Error(
      "Document type and release purpose are required to generate a new DTGSA document number."
    )
  }

  const numberingRule = await resolveNumberingRule(
    input.db,
    input.project.id,
    input.project.client.id
  )

  const customScopeKey = buildCustomScopeKey({
    projectId: input.project.id,
    disciplineCode: input.discipline.code,
    documentTypeCode: input.documentTypeCategory.code,
  })

  const scopeKey = buildSequenceScopeKey(numberingRule.sequenceScope, {
    projectId: input.project.id,
    projectCode: input.project.code,
    disciplineCode: input.discipline.code,
    documentTypeCode: input.documentTypeCategory.code,
    customScopeKey,
  })

  const sequence = await input.db.numberingSequence.upsert({
    where: {
      ruleId_scopeKey: {
        ruleId: numberingRule.id,
        scopeKey,
      },
    },
    update: {
      currentValue: {
        increment: 1,
      },
    },
    create: {
      ruleId: numberingRule.id,
      scopeKey,
      currentValue: 1,
    },
  })

  const dtgsaDocumentNumber = renderDocumentNumber({
    formatString: numberingRule.formatString,
    separator: numberingRule.separator,
    padding: numberingRule.padding,
    tokens: numberingRule.tokens.map((token) => ({
      key: token.key,
      order: token.order,
      padding: token.padding,
      separator: token.separator,
      tokenType: token.tokenType,
      valueTemplate: token.valueTemplate,
      isOptional: token.isOptional,
    })),
    sequenceValue: sequence.currentValue,
    context: {
      clientCode: input.project.client.code,
      projectCode: input.project.code,
      projectId: input.project.id,
      disciplineCode: input.discipline.code,
      documentTypeCode: input.documentTypeCategory.code,
      releasePurposeCode: input.releasePurpose.code,
      revision: input.revision,
      customScopeKey,
    },
  })

  return {
    dtgsaDocumentNumber,
    numberingRuleId: numberingRule.id,
    scopeKey,
  }
}
