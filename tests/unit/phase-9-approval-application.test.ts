import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import {
  FIRST_PAGE_RANGE_BYTES,
  assertCommentTransition,
  assertReviewSession,
  classifyInboxItem,
  filterInbox,
  firstPageRange,
  validateCommentLocation,
  validateReturnRequest,
  virtualPageWindow,
} from "@dtg/review-domain"

const inbox = [
  {
    id: "step-a",
    projectId: "project-a",
    clientId: "client-a",
    documentNumber: "DTG-A-001",
    title: "Large process drawing",
    revision: "02",
    requiredRole: "reviewer",
    stepLabel: "Independent review",
    status: "Active",
    dueAt: new Date("2026-07-28T00:00:00Z"),
  },
  {
    id: "step-b",
    projectId: "project-b",
    clientId: "client-b",
    documentNumber: "DTG-B-001",
    title: "Secret other project",
    revision: "01",
    requiredRole: "approver",
    stepLabel: "Approval",
    status: "Active",
  },
] as const

test("approval inbox filters states and denies cross-project leakage", () => {
  assert.equal(
    classifyInboxItem(inbox[0], new Date("2026-07-29T00:00:00Z")),
    "OVERDUE"
  )
  assert.deepEqual(
    filterInbox(inbox, {
      allowedProjectIds: ["project-a"],
      search: "process",
    }).map((item) => item.id),
    ["step-a"]
  )
})

test("100 MB first page requests only the controlled first range", () => {
  const size = 110 * 1024 * 1024
  const range = firstPageRange(size)
  assert.deepEqual(range, { start: 0, end: FIRST_PAGE_RANGE_BYTES - 1 })
  assert.ok(range.end + 1 < size / 100)
  assert.deepEqual(
    virtualPageWindow({ page: 50, pageCount: 100 }),
    [48, 49, 50, 51, 52]
  )
})

test("review eligibility rejects wrong package, expiry, and user", () => {
  const review = {
    userId: "user-a",
    packageHash: "a".repeat(64),
    completedAt: new Date("2026-07-29T10:00:00Z"),
    declarationAcceptedAt: new Date("2026-07-29T10:00:00Z"),
    expiresAt: new Date("2026-07-29T11:00:00Z"),
  }
  assert.doesNotThrow(() =>
    assertReviewSession(review, {
      actorUserId: "user-a",
      currentPackageHash: "a".repeat(64),
      now: new Date("2026-07-29T10:30:00Z"),
    })
  )
  assert.throws(
    () =>
      assertReviewSession(review, {
        actorUserId: "user-b",
        currentPackageHash: "a".repeat(64),
      }),
    /another user/
  )
  assert.throws(
    () =>
      assertReviewSession(review, {
        actorUserId: "user-a",
        currentPackageHash: "b".repeat(64),
      }),
    /no longer current/
  )
})

test("comments use relative locations and independent blocking closure", () => {
  assert.equal(
    validateCommentLocation({
      type: "AREA",
      pageNumber: 3,
      x: 0.1,
      y: 0.2,
      width: 0.3,
      height: 0.1,
    }).type,
    "AREA"
  )
  assert.throws(
    () =>
      assertCommentTransition({
        from: "Resolved",
        to: "Verified",
        blocking: true,
        actorUserId: "responsible",
        authorUserId: "author",
        assigneeIds: ["responsible"],
      }),
    /cannot verify/
  )
})

test("returns require reason, owner, blocking comments, due date, confirmation", () => {
  assert.doesNotThrow(() =>
    validateReturnRequest({
      reason: "Correct marked dimensions",
      responsibleDepartment: "Engineering",
      blockingCommentIds: ["comment-1"],
      dueAt: new Date("2026-08-01T00:00:00Z"),
      confirmed: true,
      now: new Date("2026-07-29T00:00:00Z"),
    })
  )
  assert.throws(
    () =>
      validateReturnRequest({
        reason: "",
        responsibleDepartment: "",
        blockingCommentIds: [],
        confirmed: false,
      }),
    /reason/
  )
})

test("viewer boundary forwards Range without exposing raw Drive identity", async () => {
  const [route, viewer, styles] = await Promise.all([
    readFile(
      "apps/approve-web/src/app/api/review/files/[fileObjectId]/route.ts",
      "utf8"
    ),
    readFile("apps/approve-web/src/app/review-viewer.tsx", "utf8"),
    readFile("apps/approve-web/src/app/globals.css", "utf8"),
  ])
  assert.match(route, /request\.headers\.get\("range"\)/)
  assert.match(route, /Cross-Origin-Resource-Policy/)
  assert.doesNotMatch(route, /driveFileId|googleDriveFileId|drive\.google/)
  assert.match(viewer, /disableAutoFetch: true/)
  assert.match(viewer, /aria-label/)
  assert.match(styles, /@media \(max-width: 900px\)/)
})
