import assert from "node:assert/strict"
import test from "node:test"
import { PdiStatus } from "@prisma/client"
import {
  assertPdiPromotionAvailable,
  resolvePdiSentStatus,
} from "../../../src/lib/pdi/policy"

test("sending a PDI item without a client number enters ClientNumberPending", () => {
  assert.equal(resolvePdiSentStatus(null), PdiStatus.ClientNumberPending)
})

test("sending a PDI item with a client number enters ClientNumberReceived", () => {
  assert.equal(
    resolvePdiSentStatus("CLIENT-001"),
    PdiStatus.ClientNumberReceived
  )
})

test("PDI promotion currently permits any item without an existing MDR link", () => {
  assert.doesNotThrow(() => assertPdiPromotionAvailable(null))
})

test("PDI promotion prevents duplicate MDR creation", () => {
  assert.throws(
    () => assertPdiPromotionAvailable({ id: "mdr-1" }),
    /already been promoted/
  )
})
