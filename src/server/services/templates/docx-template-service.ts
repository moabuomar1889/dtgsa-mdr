import "server-only"
import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"
import { CoverSheetTemplate, TransmittalTemplate } from "@prisma/client"
import { downloadFileFromSupabaseStorage } from "@/server/services/storage/storage-service"

type SupportedTemplate = Pick<
  CoverSheetTemplate | TransmittalTemplate,
  "storageBucket" | "storagePath" | "fileName"
>

export async function renderDocxTemplateFromStorage(
  template: SupportedTemplate,
  data: Record<string, unknown>
) {
  if (!template.storageBucket || !template.storagePath) {
    throw new Error("The selected DOCX template is not stored in Supabase storage.")
  }

  const bytes = await downloadFileFromSupabaseStorage(
    template.storageBucket,
    template.storagePath
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
