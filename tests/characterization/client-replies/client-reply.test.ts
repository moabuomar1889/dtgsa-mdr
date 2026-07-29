import assert from "node:assert/strict"
import test from "node:test"
import { ClientReplyState, ScopeLevel } from "@prisma/client"
import {
  buildApplicableReviewCodes,
  getNextRevisionLabel,
  resolveRejectedIdentifier,
  resolveReplyState,
  sanitizeFileName,
} from "../../../src/server/services/replies/client-reply-policy"

test("client reply state gives finalization precedence over other flags", () => {
  assert.equal(
    resolveReplyState({
      requiresResubmittal: true,
      finalizesDocument: true,
      informationalOnly: true,
    }),
    ClientReplyState.NoFurtherSubmittal
  )
})

test("client reply state gives information-only precedence over resubmittal", () => {
  assert.equal(
    resolveReplyState({
      requiresResubmittal: true,
      finalizesDocument: false,
      informationalOnly: true,
    }),
    ClientReplyState.InformationOnly
  )
})

test("client reply state maps resubmittal and neutral replies", () => {
  assert.equal(
    resolveReplyState({
      requiresResubmittal: true,
      finalizesDocument: false,
      informationalOnly: false,
    }),
    ClientReplyState.RevisionRequired
  )
  assert.equal(
    resolveReplyState({
      requiresResubmittal: false,
      finalizesDocument: false,
      informationalOnly: false,
    }),
    ClientReplyState.ReplyReceived
  )
})

test("revision labels increment numeric, alpha, and numeric-suffix forms", () => {
  assert.equal(getNextRevisionLabel("00"), "01")
  assert.equal(getNextRevisionLabel("09"), "10")
  assert.equal(getNextRevisionLabel("A"), "B")
  assert.equal(getNextRevisionLabel("REV-009"), "REV-010")
  assert.equal(getNextRevisionLabel("IFC"), "IFC-1")
})

test("rejected identifiers prefer the client number only for the configured strategy", () => {
  assert.equal(
    resolveRejectedIdentifier({
      strategy: "CLIENT_DOCUMENT_NUMBER",
      dtgsaDocumentNumber: "DTG/001",
      clientDocumentNumber: " CLIENT:001 ",
    }),
    "CLIENT-001"
  )
  assert.equal(
    resolveRejectedIdentifier({
      strategy: null,
      dtgsaDocumentNumber: "DTG/001",
      clientDocumentNumber: "CLIENT-001",
    }),
    "DTG-001"
  )
})

test("returned-file names are sanitized deterministically", () => {
  assert.equal(
    sanitizeFileName("  Return: File / 01?.pdf  "),
    "Return-_File_-_01-.pdf"
  )
})

test("review-code resolution applies project, client, then global precedence", () => {
  const common = {
    code: "A",
    label: "Approved",
    description: null,
    displayOrder: 1,
    requiresResubmittal: false,
    finalizesDocument: true,
    informationalOnly: false,
  }
  const result = buildApplicableReviewCodes("project-1", "client-1", [
    {
      ...common,
      id: "global",
      projectId: null,
      clientId: null,
      scopeLevel: ScopeLevel.Global,
    },
    {
      ...common,
      id: "client",
      projectId: null,
      clientId: "client-1",
      scopeLevel: ScopeLevel.Client,
    },
    {
      ...common,
      id: "project",
      projectId: "project-1",
      clientId: "client-1",
      scopeLevel: ScopeLevel.Project,
    },
  ])

  assert.equal(result.length, 1)
  assert.equal(result[0].id, "project")
  assert.equal(result[0].finalizesDocument, true)
})

test("review-code resolution ignores unrelated scopes and keeps display order", () => {
  const result = buildApplicableReviewCodes("project-1", "client-1", [
    {
      id: "b",
      code: "B",
      label: "Revise",
      description: null,
      displayOrder: 2,
      requiresResubmittal: true,
      finalizesDocument: false,
      informationalOnly: false,
      projectId: null,
      clientId: null,
      scopeLevel: ScopeLevel.Global,
    },
    {
      id: "unrelated",
      code: "X",
      label: "Unrelated",
      description: null,
      displayOrder: 0,
      requiresResubmittal: false,
      finalizesDocument: false,
      informationalOnly: true,
      projectId: "project-2",
      clientId: "client-2",
      scopeLevel: ScopeLevel.Project,
    },
    {
      id: "a",
      code: "A",
      label: "Approved",
      description: null,
      displayOrder: 1,
      requiresResubmittal: false,
      finalizesDocument: true,
      informationalOnly: false,
      projectId: null,
      clientId: null,
      scopeLevel: ScopeLevel.Global,
    },
  ])

  assert.deepEqual(
    result.map((item) => item.code),
    ["A", "B"]
  )
})
