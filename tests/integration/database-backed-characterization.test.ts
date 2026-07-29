import assert from "node:assert/strict"
import test from "node:test"
import { assertSafeTestDatabaseUrl } from "../helpers/database-safety"

const testDatabaseUrl = process.env.TEST_DATABASE_URL
const approvedRemoteHosts = (process.env.TEST_DATABASE_APPROVED_HOSTS ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean)

test(
  "database-backed tests fail closed unless the configured database is explicitly safe",
  {
    skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is not configured.",
  },
  () => {
    assert.doesNotThrow(() =>
      assertSafeTestDatabaseUrl(testDatabaseUrl, approvedRemoteHosts)
    )
  }
)

test.skip(
  "numbering sequence allocation and duplicate prevention use a disposable database",
  "No approved disposable PostgreSQL database was configured for Phase 1."
)

test.skip(
  "PDI creation, lifecycle, promotion, and rollback use a disposable database",
  "No approved disposable PostgreSQL database was configured for Phase 1."
)

test.skip(
  "workflow actions and signature events use a disposable database",
  "No approved disposable PostgreSQL database was configured for Phase 1."
)

test.skip(
  "client replies and revision lineage use a disposable database",
  "No approved disposable PostgreSQL database was configured for Phase 1."
)

test.skip(
  "transmittal creation and submission use faked delivery adapters and a disposable database",
  "No approved disposable PostgreSQL database was configured for Phase 1."
)

test.skip(
  "search, dashboard, task, and report read models use a disposable database",
  "No approved disposable PostgreSQL database was configured for Phase 1."
)
