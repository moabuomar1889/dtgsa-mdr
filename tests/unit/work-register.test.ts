import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import {
  splitEvidenceLines,
  workRegisterCreateSchema,
  workRegisterUpdateSchema,
} from "../../apps/mdr-web/src/lib/forms/work-register.ts"

test("work-register comments are normalized and validated", () => {
  const parsed = workRegisterCreateSchema.parse({
    title: "  Project creation fails  ",
    description: "  The project page becomes blank after I submit the form.  ",
    area: "  Projects / New Project  ",
    category: "Bug",
    priority: "High",
  })

  assert.equal(parsed.title, "Project creation fails")
  assert.equal(parsed.area, "Projects / New Project")
  assert.equal(
    workRegisterCreateSchema.safeParse({
      title: "Bad",
      description: "Too short",
      category: "Bug",
      priority: "Medium",
    }).success,
    false
  )
})

test("fixed work requires exact implementation and test evidence", () => {
  const missingEvidence = workRegisterUpdateSchema.safeParse({
    itemId: "item-1",
    status: "Fixed",
    priority: "High",
    category: "Bug",
    deploymentStatus: "NotDeployed",
    updateNote: "Implemented the fix.",
  })
  assert.equal(missingEvidence.success, false)

  const completeEvidence = workRegisterUpdateSchema.safeParse({
    itemId: "item-1",
    status: "Verified",
    priority: "High",
    category: "Bug",
    fixSummary: "Corrected the server action and added a regression test.",
    fileReferences: "apps/mdr-web/src/server/actions/work-register.ts:42",
    testEvidence: "pnpm test:unit - passed",
    commitSha: "abc1234",
    deploymentStatus: "Staging",
    updateNote: "Verified in staging.",
  })
  assert.equal(completeEvidence.success, true)

  const prematureClosure = workRegisterUpdateSchema.safeParse({
    itemId: "item-1",
    status: "Closed",
    priority: "High",
    category: "Bug",
    fixSummary: "Corrected the server action.",
    fileReferences: "apps/mdr-web/src/server/actions/work-register.ts:42",
    testEvidence: "Regression test passed",
    commitSha: "abc1234",
    deploymentStatus: "Staging",
    updateNote: "Trying to close before production.",
  })
  assert.equal(prematureClosure.success, false)
})

test("evidence lines are stored as clean, non-empty entries", () => {
  assert.deepEqual(splitEvidenceLines(" first.ts:10\r\n\n second.ts:20 \n"), [
    "first.ts:10",
    "second.ts:20",
  ])
})

test("work-register schema and additive migration stay aligned", async () => {
  const [schema, migration] = await Promise.all([
    readFile("prisma/schema.prisma", "utf8"),
    readFile(
      "prisma/migrations/20260801130000_0004_work_register/migration.sql",
      "utf8"
    ),
  ])

  assert.match(schema, /model WorkRegisterItem/)
  assert.match(schema, /model WorkRegisterActivity/)
  assert.match(migration, /CREATE TABLE "WorkRegisterItem"/)
  assert.match(migration, /CREATE TABLE "WorkRegisterActivity"/)
  assert.match(migration, /WorkRegisterItem_reporterUserId_fkey/)
})
