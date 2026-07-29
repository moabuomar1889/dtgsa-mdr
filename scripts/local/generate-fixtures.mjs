import { createHash } from "node:crypto"
import { createWriteStream } from "node:fs"
import { once } from "node:events"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

const runtimeRoot = process.env.LOCAL_RUNTIME_ROOT
if (!runtimeRoot || process.env.LOCAL_ACCEPTANCE_MODE !== "true") {
  throw new Error("Fixture generation requires an explicit local runtime.")
}

const fixtureRoot = join(runtimeRoot, "fixtures")
await mkdir(fixtureRoot, { recursive: true })

async function pdfBytes(title, pages = 1) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  for (let index = 0; index < pages; index += 1) {
    const page = pdf.addPage([841.89, 595.28])
    page.drawRectangle({
      x: 24,
      y: 24,
      width: 793,
      height: 547,
      borderColor: rgb(0.08, 0.25, 0.22),
      borderWidth: 2,
    })
    page.drawText(title, { x: 48, y: 520, size: 24, font })
    page.drawText(`SYNTHETIC LOCAL ACCEPTANCE / PAGE ${index + 1}`, {
      x: 48,
      y: 486,
      size: 11,
      font,
    })
    for (let line = 0; line < 18; line += 1) {
      const y = 450 - line * 21
      page.drawLine({
        start: { x: 48, y },
        end: { x: 790, y: y - (line % 3) * 5 },
        thickness: line % 5 === 0 ? 2 : 0.7,
        color: rgb(0.25, 0.42, 0.37),
      })
    }
  }
  return Buffer.from(await pdf.save())
}

async function writeSizedPdf(name, targetBytes, title) {
  const path = join(fixtureRoot, name)
  const prefixFor = (streamLength) => [
    `%PDF-1.7\n% ${title.replace(/[^\x20-\x7e]/g, "")}\n`,
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 4 0 R /Resources << >> >>\nendobj\n`,
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n`,
  ]
  const tailFor = (offsets, streamEndOffset) => {
    const preXref = "\nendstream\nendobj\n"
    const xrefOffset = streamEndOffset + Buffer.byteLength(preXref)
    return `${preXref}xref\n0 5\n0000000000 65535 f \n${offsets
      .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
      .join(
        ""
      )}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  }

  let streamLength = targetBytes
  let prefix
  let offsets
  let tail
  for (let attempt = 0; attempt < 8; attempt += 1) {
    prefix = prefixFor(streamLength)
    offsets = []
    let offset = Buffer.byteLength(prefix[0])
    for (let index = 1; index < prefix.length; index += 1) {
      offsets.push(offset)
      offset += Buffer.byteLength(prefix[index])
    }
    tail = tailFor(offsets, offset + streamLength)
    const next =
      targetBytes - Buffer.byteLength(prefix.join("")) - Buffer.byteLength(tail)
    if (next === streamLength) break
    streamLength = next
  }
  if (!prefix || !tail || streamLength <= 0) {
    throw new Error(`Could not size ${name}.`)
  }
  const output = createWriteStream(path)
  output.write(prefix.join(""))
  const chunk = Buffer.alloc(1024 * 1024, 0x20)
  let remaining = streamLength
  while (remaining > 0) {
    const bytes = Math.min(remaining, chunk.length)
    if (!output.write(chunk.subarray(0, bytes))) await once(output, "drain")
    remaining -= bytes
  }
  output.end(tail)
  await once(output, "close")
  return path
}

const small = await pdfBytes("Small controlled document", 2)
await writeFile(join(fixtureRoot, "small.pdf"), small)
await writeFile(
  join(fixtureRoot, "engineering-multipage.pdf"),
  await pdfBytes("Engineering drawing package", 12)
)
await writeFile(
  join(fixtureRoot, "client-response-cover.pdf"),
  await pdfBytes("Client response cover")
)
await writeFile(
  join(fixtureRoot, "approval-letter.pdf"),
  await pdfBytes("Approval letter")
)
await writeFile(
  join(fixtureRoot, "transmittal.pdf"),
  await pdfBytes("Transmittal")
)
await writeSizedPdf("10-mib.pdf", 10 * 1024 * 1024, "10 MiB viewer fixture")
await writeSizedPdf("100-mib.pdf", 100 * 1024 * 1024, "100 MiB qpdf fixture")
await writeSizedPdf("500-mib.pdf", 500 * 1024 * 1024, "500 MiB qpdf fixture")
await writeFile(join(fixtureRoot, "corrupt.pdf"), Buffer.from("%PDF-corrupt"))
await writeFile(
  join(fixtureRoot, "existing-signature-metadata.json"),
  JSON.stringify(
    {
      synthetic: true,
      signatureField: "ExistingSyntheticSignature",
      verification: "NOT_CRYPTOGRAPHICALLY_VERIFIED",
    },
    null,
    2
  )
)
await writeFile(
  join(fixtureRoot, "comment-sheet.txt"),
  "Synthetic page comments for local acceptance.\n"
)
await writeFile(
  join(fixtureRoot, "attachment.txt"),
  "Synthetic text attachment.\n"
)
await writeFile(
  join(fixtureRoot, "image.svg"),
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480"><rect width="800" height="480" fill="#17332d"/><text x="60" y="240" fill="#e7b34f" font-size="36">Synthetic engineering image</text></svg>'
)
await writeFile(
  join(fixtureRoot, "pdi-import.csv"),
  "documentNumber,title,discipline,revision\nLOCAL-ALPHA-ELE-DRW-0002,Synthetic cable schedule,ELE,00\n"
)
await writeFile(
  join(fixtureRoot, "invalid-workbook.xlsx"),
  "This is intentionally not an Excel workbook."
)

const inventory = {}
for (const name of [
  "small.pdf",
  "engineering-multipage.pdf",
  "10-mib.pdf",
  "100-mib.pdf",
  "500-mib.pdf",
  "corrupt.pdf",
]) {
  const bytes = await import("node:fs/promises").then(({ readFile }) =>
    readFile(join(fixtureRoot, name))
  )
  inventory[name] = {
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  }
}
await writeFile(
  join(fixtureRoot, "inventory.json"),
  JSON.stringify(inventory, null, 2)
)
console.log(`Synthetic fixtures generated under ${fixtureRoot}.`)
