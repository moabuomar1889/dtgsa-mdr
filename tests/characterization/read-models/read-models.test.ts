import assert from "node:assert/strict"
import test from "node:test"
import {
  createEmptySearchResult,
  normalizeSearchQuery,
} from "../../../src/lib/search/query"

test("search query normalization trims input and handles null values", () => {
  assert.equal(normalizeSearchQuery("  DTG-001  "), "DTG-001")
  assert.equal(normalizeSearchQuery(null), "")
  assert.equal(normalizeSearchQuery(undefined), "")
})

test("empty search results preserve the current stable result shape", () => {
  assert.deepEqual(createEmptySearchResult("x"), {
    search: "x",
    counts: {
      projects: 0,
      pdiItems: 0,
      mdrDocuments: 0,
      transmittals: 0,
      clientReplies: 0,
    },
    projects: [],
    pdiItems: [],
    mdrDocuments: [],
    transmittals: [],
    clientReplies: [],
  })
})
