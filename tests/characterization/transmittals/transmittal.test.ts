import assert from "node:assert/strict"
import test from "node:test"
import { DocumentFileType } from "@prisma/client"
import {
  extractEmailRecipients,
  pickPreferredAttachmentFile,
  resolveTransmittalMaxBytes,
} from "../../../src/server/services/transmittals/transmittal-policy"

test("transmittals prefer merged files, then revision source, source, and preview", () => {
  const files = [
    {
      id: "preview",
      type: DocumentFileType.PREVIEW,
      fileName: "preview.pdf",
      fileSizeBytes: 100,
    },
    {
      id: "source",
      type: DocumentFileType.SOURCE,
      fileName: "source.pdf",
      fileSizeBytes: 200,
    },
    {
      id: "merged",
      type: DocumentFileType.MERGED,
      fileName: "merged.pdf",
      fileSizeBytes: 300,
    },
  ]

  assert.equal(pickPreferredAttachmentFile(files)?.id, "merged")
  assert.equal(pickPreferredAttachmentFile(files.slice(0, 2))?.id, "source")
  assert.equal(pickPreferredAttachmentFile([]), null)
})

test("transmittal size limit uses project, client, then default precedence", () => {
  assert.equal(
    resolveTransmittalMaxBytes({
      projectOverrideMb: 5,
      clientDefaultMb: 10,
      defaultMaxMb: 25,
    }),
    5 * 1024 * 1024
  )
  assert.equal(
    resolveTransmittalMaxBytes({
      clientDefaultMb: 10,
      defaultMaxMb: 25,
    }),
    10 * 1024 * 1024
  )
  assert.equal(
    resolveTransmittalMaxBytes({
      defaultMaxMb: 25,
    }),
    25 * 1024 * 1024
  )
})

test("transmittal recipient extraction normalizes and deduplicates addresses", () => {
  assert.deepEqual(
    extractEmailRecipients(
      "Primary <DOCUMENTS@EXAMPLE.COM>; copy@example.com",
      "documents@example.com, invalid",
      null
    ),
    ["documents@example.com", "copy@example.com"]
  )
})
