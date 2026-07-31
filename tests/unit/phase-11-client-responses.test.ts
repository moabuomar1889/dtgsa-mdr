import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import {
  AIR_PRODUCTS_RESPONSE_FIXTURE,
  buildClientResponseAssemblyProfile,
  canCloseFromResponse,
  CONDITIONAL_CODE_2_FIXTURE,
  JIGPC_RESPONSE_FIXTURE,
  nextRevisionLabel,
  validateEffects,
  validateResponseCodeDefinitions,
  type ResponseCodeDefinition,
} from "@dtg/client-response-domain"
import { responsePolicySnapshot } from "@dtg/client-response-domain/server"

test("numeric response codes remain policy-specific instead of global rules", () => {
  const airProductsCode2 = AIR_PRODUCTS_RESPONSE_FIXTURE.codes.find(
    (code) => code.externalCode === "2"
  )
  const jigpcCode2 = JIGPC_RESPONSE_FIXTURE.codes.find(
    (code) => code.externalCode === "2"
  )

  assert.ok(airProductsCode2)
  assert.ok(jigpcCode2)
  assert.notEqual(
    airProductsCode2.effects.outcomeClass,
    jigpcCode2.effects.outcomeClass
  )
  assert.equal(
    validateResponseCodeDefinitions(AIR_PRODUCTS_RESPONSE_FIXTURE.codes).length,
    0
  )
  assert.equal(
    validateResponseCodeDefinitions(JIGPC_RESPONSE_FIXTURE.codes).length,
    0
  )
})

test("missing Code 3 and numeric, letter, or text codes are valid", () => {
  const codes = [
    AIR_PRODUCTS_RESPONSE_FIXTURE.codes[0],
    {
      ...AIR_PRODUCTS_RESPONSE_FIXTURE.codes[1],
      externalCode: "A",
    },
    {
      ...AIR_PRODUCTS_RESPONSE_FIXTURE.codes[2],
      externalCode: "HOLD FOR REVIEW",
    },
  ]

  assert.equal(validateResponseCodeDefinitions(codes).length, 0)
})

test("conditional Code 2 independently drives approval and revision effects", () => {
  const code = CONDITIONAL_CODE_2_FIXTURE.codes[0]

  assert.equal(code.effects.countsAsApproved, true)
  assert.equal(code.effects.finalApproval, false)
  assert.equal(code.effects.rectificationRequired, true)
  assert.equal(code.effects.newRevisionRequired, true)
  assert.equal(code.effects.internalReapprovalRequired, true)
  assert.equal(code.effects.resubmissionRequired, true)
  assert.equal(canCloseFromResponse(code.effects), false)
})

test("resubmission and final closure are controlled only by configured effects", () => {
  const jigpcCode3 = JIGPC_RESPONSE_FIXTURE.codes.find(
    (code) => code.externalCode === "3"
  )
  const jigpcCode4 = JIGPC_RESPONSE_FIXTURE.codes.find(
    (code) => code.externalCode === "4"
  )

  assert.equal(jigpcCode3?.effects.resubmissionRequired, true)
  assert.equal(jigpcCode3 && canCloseFromResponse(jigpcCode3.effects), false)
  assert.equal(jigpcCode4 && canCloseFromResponse(jigpcCode4.effects), true)

  const nonFinalCode4 = {
    ...jigpcCode4!.effects,
    finalApproval: false,
    closureAllowed: false,
  }
  assert.equal(canCloseFromResponse(nonFinalCode4), false)
})

test("rejected outcomes can never be configured as approved", () => {
  const rejected = AIR_PRODUCTS_RESPONSE_FIXTURE.codes[0]
  assert.deepEqual(
    validateEffects({
      ...rejected.effects,
      countsAsApproved: true,
    }),
    ["Rejected outcomes cannot count as approved."]
  )
})

test("policy snapshots preserve exact wording and produce deterministic hashes", () => {
  const code: ResponseCodeDefinition = {
    ...AIR_PRODUCTS_RESPONSE_FIXTURE.codes[1],
    exactWording: "Client's exact conditional wording",
  }
  const first = responsePolicySnapshot({
    codeSetId: "set-1",
    versionId: "version-1",
    version: 3,
    code,
  })
  const second = responsePolicySnapshot({
    codeSetId: "set-1",
    versionId: "version-1",
    version: 3,
    code: {
      ...code,
      effects: {
        returnedFileRequired: code.effects.returnedFileRequired,
        outcomeClass: code.effects.outcomeClass,
        countsAsApproved: code.effects.countsAsApproved,
        finalApproval: code.effects.finalApproval,
        rectificationRequired: code.effects.rectificationRequired,
        newRevisionRequired: code.effects.newRevisionRequired,
        internalReapprovalRequired: code.effects.internalReapprovalRequired,
        resubmissionRequired: code.effects.resubmissionRequired,
        temporaryUseAllowed: code.effects.temporaryUseAllowed,
        closureAllowed: code.effects.closureAllowed,
        newDocumentNumberRequired: code.effects.newDocumentNumberRequired,
        expectedFileKind: code.effects.expectedFileKind,
      },
    },
  })

  assert.equal(first.content.exactWording, "Client's exact conditional wording")
  assert.equal(first.hash, second.hash)
})

test("download profiles use the exact main file submitted to the client", () => {
  const coverOnly = buildClientResponseAssemblyProfile({
    fileKind: "COVER_ONLY",
    primaryResponseFileId: "returned-cover",
    submittedMainFileId: "submitted-main-v1",
    attachmentFileIds: ["markup"],
  })
  const commentSheet = buildClientResponseAssemblyProfile({
    fileKind: "COMMENT_SHEET",
    primaryResponseFileId: "comment-sheet",
    submittedMainFileId: "submitted-main-v1",
    statusCoverFileId: "status-cover",
  })

  assert.deepEqual(coverOnly.componentFileIds, [
    "returned-cover",
    "submitted-main-v1",
    "markup",
  ])
  assert.deepEqual(commentSheet.componentFileIds, [
    "status-cover",
    "comment-sheet",
    "submitted-main-v1",
  ])
})

test("revision labels preserve the base numbering convention", () => {
  assert.equal(nextRevisionLabel("01"), "02")
  assert.equal(nextRevisionLabel("A"), "B")
  assert.equal(nextRevisionLabel("IFC-09"), "IFC-10")
  assert.equal(nextRevisionLabel("CURRENT"), "CURRENT-1")
})

test("implementation contains no numeric-code branching and never copies signatures", async () => {
  const service = await readFile(
    new URL(
      "../../apps/mdr-web/src/server/services/replies/client-response-service.ts",
      import.meta.url
    ),
    "utf8"
  )

  assert.doesNotMatch(service, /code\s*===\s*["'][0-9]+["']/)
  assert.match(service, /submission\.submittedMainFileObjectId/)
  assert.match(service, /signaturesCopied:\s*false/)
})
