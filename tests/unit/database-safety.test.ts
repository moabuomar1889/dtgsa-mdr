import assert from "node:assert/strict"
import test from "node:test"
import { assertSafeTestDatabaseUrl } from "../helpers/database-safety"

test("database safety accepts an explicitly named local test database", () => {
  assert.deepEqual(
    assertSafeTestDatabaseUrl("postgresql://user:pass@localhost:5432/mdr_test"),
    {
      host: "localhost",
      databaseName: "mdr_test",
    }
  )
})

test("database safety fails closed when the URL is missing", () => {
  assert.throws(
    () => assertSafeTestDatabaseUrl(undefined),
    /TEST_DATABASE_URL is required/
  )
})

test("database safety rejects names without a test marker", () => {
  assert.throws(
    () =>
      assertSafeTestDatabaseUrl(
        "postgresql://user:pass@localhost:5432/mdr_platform"
      ),
    /explicitly marked as test/
  )
})

test("database safety rejects production-like database names", () => {
  assert.throws(
    () =>
      assertSafeTestDatabaseUrl(
        "postgresql://user:pass@localhost:5432/mdr_test_prod"
      ),
    /Production-like/
  )
})

test("database safety rejects unapproved remote hosts", () => {
  assert.throws(
    () =>
      assertSafeTestDatabaseUrl(
        "postgresql://user:pass@database.example.com:5432/mdr_test"
      ),
    /not explicitly approved/
  )
})

test("database safety accepts an explicitly approved remote test host", () => {
  assert.equal(
    assertSafeTestDatabaseUrl(
      "postgresql://user:pass@test-db.internal:5432/mdr_test",
      ["test-db.internal"]
    ).host,
    "test-db.internal"
  )
})
