import { PDFDocument, StandardFonts } from "pdf-lib"

export async function createSamplePdf(pageLabels: string[]) {
  const document = await PDFDocument.create()
  const font = await document.embedFont(StandardFonts.Helvetica)

  for (const label of pageLabels) {
    const page = document.addPage([300, 200])
    page.drawText(label, {
      x: 30,
      y: 100,
      size: 16,
      font,
    })
  }

  return Buffer.from(await document.save())
}
