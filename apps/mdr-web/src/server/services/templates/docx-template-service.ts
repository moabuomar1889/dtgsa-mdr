import "server-only"
import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"
import { CoverSheetTemplate, TransmittalTemplate } from "@prisma/client"
import { downloadFileFromStorage } from "@/server/services/storage/storage-service"

type SupportedTemplate = Pick<
  CoverSheetTemplate | TransmittalTemplate,
  "storageProvider" | "providerKey" | "fileName"
>

export async function renderDocxTemplateFromStorage(
  template: SupportedTemplate,
  data: Record<string, unknown>
) {
  if (!template.providerKey) {
    throw new Error("The selected DOCX template has no provider key.")
  }

  const bytes = await downloadFileFromStorage(
    template.storageProvider,
    template.providerKey
  )
  const zip = new PizZip(bytes)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  })

  doc.render(data)

  return Buffer.from(
    doc.getZip().generate({
      type: "uint8array",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })
  )
}
