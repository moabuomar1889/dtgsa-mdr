import assert from "node:assert/strict"
import test from "node:test"
import { NumberingSequenceScope, NumberingTokenType } from "@prisma/client"
import {
  buildSequenceScopeKey,
  formatSequenceValue,
  renderDocumentNumber,
  type NumberingTokenInput,
} from "@/lib/numbering/engine"

function token(
  key: string,
  order: number,
  tokenType: NumberingTokenType,
  overrides: Partial<NumberingTokenInput> = {}
): NumberingTokenInput {
  return {
    key,
    order,
    tokenType,
    padding: null,
    separator: null,
    valueTemplate: null,
    ...overrides,
  }
}

test("numbering renders ordered tokens with default separators and padding", () => {
  assert.equal(
    renderDocumentNumber({
      tokens: [
        token("sequence", 4, NumberingTokenType.Sequence),
        token("project", 2, NumberingTokenType.ProjectCode),
        token("client", 1, NumberingTokenType.ClientCode),
        token("discipline", 3, NumberingTokenType.DisciplineCode),
      ],
      sequenceValue: 27,
      context: {
        clientCode: "DTG",
        projectCode: "PRJ",
        disciplineCode: "ARC",
      },
    }),
    "DTG-PRJ-ARC-0027"
  )
})

test("numbering supports format strings, prefixes, suffixes, and optional tokens", () => {
  assert.equal(
    renderDocumentNumber({
      formatString: "DOC-{project}-{purpose}-{sequence}-ISSUED",
      separator: "-",
      padding: 3,
      tokens: [
        token("project", 1, NumberingTokenType.ProjectCode),
        token("purpose", 2, NumberingTokenType.ReleasePurposeCode, {
          isOptional: true,
        }),
        token("sequence", 3, NumberingTokenType.Sequence),
      ],
      sequenceValue: 8,
      context: {
        projectCode: "P100",
      },
    }),
    "DOC-P100-008-ISSUED"
  )
})

test("numbering rejects a missing required token", () => {
  assert.throws(
    () =>
      renderDocumentNumber({
        tokens: [token("discipline", 1, NumberingTokenType.DisciplineCode)],
        sequenceValue: 1,
        context: {},
      }),
    /Missing required numbering token value/
  )
})

test("base document numbering remains independent of revision when no revision token exists", () => {
  const input = {
    tokens: [
      token("project", 1, NumberingTokenType.ProjectCode),
      token("sequence", 2, NumberingTokenType.Sequence),
    ],
    sequenceValue: 10,
  }

  assert.equal(
    renderDocumentNumber({
      ...input,
      context: { projectCode: "P1", revision: "00" },
    }),
    renderDocumentNumber({
      ...input,
      context: { projectCode: "P1", revision: "05" },
    })
  )
})

test("sequence formatting preserves requested padding", () => {
  assert.equal(formatSequenceValue(42, 6), "000042")
})

test("sequence scope keys distinguish global, project, discipline, and document type", () => {
  const context = {
    projectId: "project-1",
    disciplineCode: "ARC",
    documentTypeCode: "DWG",
  }

  assert.equal(
    buildSequenceScopeKey(NumberingSequenceScope.GLOBAL, context),
    "GLOBAL"
  )
  assert.equal(
    buildSequenceScopeKey(NumberingSequenceScope.PER_PROJECT, context),
    "PROJECT:project-1"
  )
  assert.equal(
    buildSequenceScopeKey(NumberingSequenceScope.PER_DISCIPLINE, context),
    "PROJECT:project-1|DISCIPLINE:ARC"
  )
  assert.equal(
    buildSequenceScopeKey(NumberingSequenceScope.PER_DOC_TYPE, context),
    "PROJECT:project-1|DOC_TYPE:DWG"
  )
})

test("sequence scope validation fails when required context is absent", () => {
  assert.throws(
    () => buildSequenceScopeKey(NumberingSequenceScope.PER_PROJECT, {}),
    /requires a project scope key/
  )
  assert.throws(
    () =>
      buildSequenceScopeKey(NumberingSequenceScope.PER_DISCIPLINE, {
        projectId: "project-1",
      }),
    /requires project and discipline/
  )
  assert.throws(
    () => buildSequenceScopeKey(NumberingSequenceScope.CUSTOM_KEY, {}),
    /requires customScopeKey/
  )
})
