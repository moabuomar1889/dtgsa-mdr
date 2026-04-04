import "server-only"
import { degrees, PDFDocument, StandardFonts, rgb } from "pdf-lib"

type SimplePdfSection = {
  label: string
  value: string
}

type SignatureBlock = {
  label: string
  name: string | null
  signedAt?: Date | null
  imageBytes?: Uint8Array | null
}

type CoverPdfInput = {
  title: string
  subtitle: string
  sections: SimplePdfSection[]
  signatures?: SignatureBlock[]
}

type TransmittalPdfInput = {
  transmittalNumber: string
  subject: string
  projectName: string
  projectCode: string
  fromText?: string | null
  toText?: string | null
  attention?: string | null
  messageBody?: string | null
  items: Array<{
    documentNumber: string
    revisionLabel: string
    title: string
  }>
}

function wrapText(text: string, maxCharacters = 82) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const next = current ? `${current} ${word}` : word

    if (next.length > maxCharacters && current) {
      lines.push(current)
      current = word
      continue
    }

    current = next
  }

  if (current) {
    lines.push(current)
  }

  return lines
}

async function drawSignatureBlock(input: {
  pdfDoc: PDFDocument
  page: Awaited<ReturnType<PDFDocument["addPage"]>>
  x: number
  y: number
  width: number
  block: SignatureBlock
}) {
  const { pdfDoc, page, x, y, width, block } = input
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  page.drawRectangle({
    x,
    y: y - 72,
    width,
    height: 72,
    borderColor: rgb(0.84, 0.86, 0.9),
    borderWidth: 1,
  })

  page.drawText(block.label, {
    x: x + 8,
    y: y - 16,
    size: 9,
    font: bold,
    color: rgb(0.16, 0.18, 0.22),
  })

  if (block.imageBytes) {
    try {
      const image = await (block.imageBytes[0] === 0x89
        ? pdfDoc.embedPng(block.imageBytes)
        : pdfDoc.embedJpg(block.imageBytes))

      page.drawImage(image, {
        x: x + 8,
        y: y - 54,
        width: 84,
        height: 28,
      })
    } catch {
      // Ignore unsupported signature image types and continue with text.
    }
  }

  if (block.name) {
    page.drawText(block.name, {
      x: x + 100,
      y: y - 34,
      size: 10,
      font,
      color: rgb(0.16, 0.18, 0.22),
    })
  }

  if (block.signedAt) {
    page.drawText(block.signedAt.toLocaleString("en-US"), {
      x: x + 100,
      y: y - 50,
      size: 8,
      font,
      color: rgb(0.38, 0.41, 0.47),
    })
  }
}

export async function createCoverPdfBuffer(input: CoverPdfInput) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const brand = rgb(0.11, 0.26, 0.53)
  const ink = rgb(0.16, 0.18, 0.22)
  const muted = rgb(0.42, 0.46, 0.52)

  page.drawRectangle({
    x: 40,
    y: 736,
    width: 515,
    height: 72,
    color: brand,
  })

  page.drawText(input.title, {
    x: 56,
    y: 775,
    size: 24,
    font: bold,
    color: rgb(1, 1, 1),
  })

  page.drawText(input.subtitle, {
    x: 56,
    y: 752,
    size: 11,
    font,
    color: rgb(0.91, 0.94, 1),
  })

  let currentY = 708

  for (const section of input.sections) {
    page.drawText(section.label, {
      x: 56,
      y: currentY,
      size: 9,
      font: bold,
      color: muted,
    })

    const wrapped = wrapText(section.value || "-", 76)
    let valueY = currentY - 18

    for (const line of wrapped) {
      page.drawText(line, {
        x: 56,
        y: valueY,
        size: 11,
        font,
        color: ink,
      })
      valueY -= 14
    }

    currentY = valueY - 10

    page.drawLine({
      start: { x: 56, y: currentY + 4 },
      end: { x: 540, y: currentY + 4 },
      thickness: 0.7,
      color: rgb(0.9, 0.91, 0.93),
    })
  }

  const signatureBlocks = input.signatures?.filter(
    (block) => block.name || block.imageBytes
  )

  if (signatureBlocks && signatureBlocks.length > 0) {
    let blockY = Math.max(170, currentY - 18)

    page.drawText("Workflow signatures", {
      x: 56,
      y: blockY,
      size: 11,
      font: bold,
      color: ink,
    })

    blockY -= 16

    for (const [index, block] of signatureBlocks.entries()) {
      await drawSignatureBlock({
        pdfDoc,
        page,
        x: 56 + (index % 2) * 244,
        y: blockY - Math.floor(index / 2) * 90,
        width: 220,
        block,
      })
    }
  }

  return Buffer.from(await pdfDoc.save())
}

export async function createTransmittalPdfBuffer(input: TransmittalPdfInput) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const brand = rgb(0.13, 0.3, 0.56)
  const ink = rgb(0.16, 0.18, 0.22)
  const muted = rgb(0.42, 0.46, 0.52)

  page.drawRectangle({
    x: 40,
    y: 764,
    width: 515,
    height: 44,
    color: brand,
  })

  page.drawText(`Transmittal ${input.transmittalNumber}`, {
    x: 56,
    y: 783,
    size: 20,
    font: bold,
    color: rgb(1, 1, 1),
  })

  const summarySections = [
    { label: "Project", value: `${input.projectCode} - ${input.projectName}` },
    { label: "Subject", value: input.subject },
    { label: "From", value: input.fromText || "-" },
    { label: "To", value: input.toText || "-" },
    { label: "Attention", value: input.attention || "-" },
    { label: "Message", value: input.messageBody || "-" },
  ]

  let currentY = 734

  for (const section of summarySections) {
    page.drawText(section.label, {
      x: 56,
      y: currentY,
      size: 9,
      font: bold,
      color: muted,
    })

    const lines = wrapText(section.value, 82)
    let lineY = currentY - 16

    for (const line of lines) {
      page.drawText(line, {
        x: 120,
        y: lineY,
        size: 10,
        font,
        color: ink,
      })
      lineY -= 12
    }

    currentY = lineY - 4
  }

  page.drawText("Attached documents", {
    x: 56,
    y: currentY - 8,
    size: 11,
    font: bold,
    color: ink,
  })

  let tableY = currentY - 28

  for (const [index, item] of input.items.entries()) {
    if (tableY < 76) {
      break
    }

    page.drawRectangle({
      x: 56,
      y: tableY - 22,
      width: 484,
      height: 24,
      color: index % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
      borderColor: rgb(0.88, 0.9, 0.93),
      borderWidth: 0.7,
    })

    page.drawText(item.documentNumber, {
      x: 64,
      y: tableY - 14,
      size: 9,
      font: bold,
      color: ink,
    })
    page.drawText(`Rev ${item.revisionLabel}`, {
      x: 190,
      y: tableY - 14,
      size: 9,
      font,
      color: ink,
    })
    page.drawText(item.title.slice(0, 50), {
      x: 252,
      y: tableY - 14,
      size: 9,
      font,
      color: ink,
    })

    tableY -= 28
  }

  return Buffer.from(await pdfDoc.save())
}

export async function mergePdfBuffers(buffers: Array<Uint8Array | Buffer>) {
  const mergedPdf = await PDFDocument.create()

  for (const buffer of buffers) {
    const source = await PDFDocument.load(buffer)
    const copiedPages = await mergedPdf.copyPages(source, source.getPageIndices())

    for (const page of copiedPages) {
      mergedPdf.addPage(page)
    }
  }

  return Buffer.from(await mergedPdf.save())
}

export async function splitPdfBuffer(buffer: Uint8Array | Buffer) {
  const source = await PDFDocument.load(buffer)
  const pages: Buffer[] = []

  for (const pageIndex of source.getPageIndices()) {
    const nextPdf = await PDFDocument.create()
    const [page] = await nextPdf.copyPages(source, [pageIndex])
    nextPdf.addPage(page)
    pages.push(Buffer.from(await nextPdf.save()))
  }

  return pages
}

export async function removePdfPages(
  buffer: Uint8Array | Buffer,
  pageIndexesToRemove: number[]
) {
  const source = await PDFDocument.load(buffer)
  const indexes = new Set(pageIndexesToRemove)

  for (const index of [...source.getPageIndices()].reverse()) {
    if (indexes.has(index)) {
      source.removePage(index)
    }
  }

  return Buffer.from(await source.save())
}

export async function reorderPdfPages(
  buffer: Uint8Array | Buffer,
  orderedIndexes: number[]
) {
  const source = await PDFDocument.load(buffer)
  const nextPdf = await PDFDocument.create()
  const copiedPages = await nextPdf.copyPages(source, orderedIndexes)

  for (const page of copiedPages) {
    nextPdf.addPage(page)
  }

  return Buffer.from(await nextPdf.save())
}

export async function rotatePdfPages(
  buffer: Uint8Array | Buffer,
  rotations: Array<{ pageIndex: number; degreesValue: 90 | 180 | 270 }>
) {
  const source = await PDFDocument.load(buffer)

  for (const rotation of rotations) {
    const page = source.getPage(rotation.pageIndex)
    page.setRotation(degrees(rotation.degreesValue))
  }

  return Buffer.from(await source.save())
}

export async function stampPdfWithText(
  buffer: Uint8Array | Buffer,
  input: {
    text: string
    pageIndex?: number
    x?: number
    y?: number
    size?: number
  }
) {
  const source = await PDFDocument.load(buffer)
  const font = await source.embedFont(StandardFonts.HelveticaBold)
  const page = source.getPage(input.pageIndex ?? 0)

  page.drawText(input.text, {
    x: input.x ?? 36,
    y: input.y ?? 36,
    size: input.size ?? 10,
    font,
    color: rgb(0.72, 0.09, 0.09),
  })

  return Buffer.from(await source.save())
}
