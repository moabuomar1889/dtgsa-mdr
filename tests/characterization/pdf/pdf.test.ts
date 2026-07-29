import assert from "node:assert/strict"
import test from "node:test"
import { PDFDocument } from "pdf-lib"
import {
  mergePdfBuffers,
  removePdfPages,
  reorderPdfPages,
  rotatePdfPages,
  splitPdfBuffer,
  stampPdfWithText,
} from "../../../src/lib/pdf/toolkit"
import { createSamplePdf } from "../../fixtures/pdf/sample-pdf"

async function pageCount(buffer: Uint8Array | Buffer) {
  return (await PDFDocument.load(buffer)).getPageCount()
}

test("PDF merge preserves every input page in order", async () => {
  const merged = await mergePdfBuffers([
    await createSamplePdf(["A1", "A2"]),
    await createSamplePdf(["B1"]),
  ])

  assert.equal(await pageCount(merged), 3)
})

test("PDF split returns one valid PDF per source page", async () => {
  const pages = await splitPdfBuffer(
    await createSamplePdf(["Page 1", "Page 2", "Page 3"])
  )

  assert.equal(pages.length, 3)
  assert.deepEqual(await Promise.all(pages.map(pageCount)), [1, 1, 1])
})

test("PDF page removal uses zero-based indexes and preserves remaining pages", async () => {
  const result = await removePdfPages(
    await createSamplePdf(["Page 1", "Page 2", "Page 3"]),
    [1]
  )

  assert.equal(await pageCount(result), 2)
})

test("PDF page removal with an empty selection preserves the page count", async () => {
  const result = await removePdfPages(
    await createSamplePdf(["Page 1", "Page 2"]),
    []
  )

  assert.equal(await pageCount(result), 2)
})

test("PDF reorder emits exactly the requested indexes", async () => {
  const result = await reorderPdfPages(
    await createSamplePdf(["Page 1", "Page 2", "Page 3"]),
    [2, 0]
  )

  assert.equal(await pageCount(result), 2)
})

test("PDF rotation stores the requested page rotation", async () => {
  const result = await rotatePdfPages(await createSamplePdf(["Page 1"]), [
    { pageIndex: 0, degreesValue: 90 },
  ])
  const document = await PDFDocument.load(result)

  assert.equal(document.getPage(0).getRotation().angle, 90)
})

test("PDF stamping preserves page count and produces a readable document", async () => {
  const source = await createSamplePdf(["Page 1", "Page 2"])
  const result = await stampPdfWithText(source, {
    text: "SANITIZED TEST STAMP",
    pageIndex: 1,
  })

  assert.equal(await pageCount(result), 2)
  assert.notDeepEqual(result, source)
})

test("PDF utilities reject corrupt input", async () => {
  await assert.rejects(() => splitPdfBuffer(Buffer.from("corrupt")))
  await assert.rejects(() =>
    mergePdfBuffers([Buffer.from("corrupt"), Buffer.from("invalid")])
  )
})

test("PDF utilities reject out-of-range page selections", async () => {
  const source = await createSamplePdf(["Page 1"])

  await assert.rejects(() => reorderPdfPages(source, [2]))
  await assert.rejects(() =>
    rotatePdfPages(source, [{ pageIndex: 2, degreesValue: 90 }])
  )
})
