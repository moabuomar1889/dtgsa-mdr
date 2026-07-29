import assert from "node:assert/strict"
import test from "node:test"
import { PdiStatus } from "@prisma/client"
import {
  assertPdiPromotionAvailable,
  assertPdiTransition,
  resolvePdiSentStatus,
} from "@/lib/pdi/policy"

test("sending a PDI item without a client number enters ClientNumberPending", () => {
  assert.equal(resolvePdiSentStatus(null), PdiStatus.ClientNumberPending)
})

test("sending a PDI item with a client number enters ClientNumberReceived", () => {
  assert.equal(
    resolvePdiSentStatus("CLIENT-001"),
    PdiStatus.ClientNumberReceived
  )
})

test("PDI promotion requires the official client number state", () => {
  assert.doesNotThrow(() =>
    assertPdiPromotionAvailable(null, PdiStatus.ClientNumberReceived)
  )
  assert.throws(
    () => assertPdiPromotionAvailable(null, PdiStatus.Draft),
    /only after the official client document number/
  )
})

test("PDI promotion prevents duplicate MDR creation", () => {
  assert.throws(
    () =>
      assertPdiPromotionAvailable(
        { id: "mdr-1" },
        PdiStatus.ClientNumberReceived
      ),
    /already been promoted/
  )
})

test("PDI transitions reject backwards movement and allow idempotency", () => {
  assert.equal(
    assertPdiTransition(
      PdiStatus.ClientNumberPending,
      PdiStatus.ClientNumberPending
    ),
    false
  )
  assert.equal(
    assertPdiTransition(
      PdiStatus.ClientNumberPending,
      PdiStatus.ClientNumberReceived
    ),
    true
  )
  assert.throws(
    () => assertPdiTransition(PdiStatus.ClientNumberReceived, PdiStatus.Draft),
    /not allowed/
  )
})
