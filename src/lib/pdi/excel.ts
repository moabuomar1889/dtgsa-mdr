import * as XLSX from "xlsx"

export const PDI_EXPORT_COLUMNS = [
  "ProjectCode",
  "ProjectName",
  "ClientCode",
  "DtgsaDocumentNumber",
  "ClientDocumentNumber",
  "DisciplineCode",
  "DisciplineName",
  "DocumentTypeCode",
  "ReleasePurposeCode",
  "Title",
  "Revision",
  "Status",
  "Tags",
  "Remarks",
] as const

export type PdiWorkbookRow = Record<string, unknown>

export function normalizePdiCell(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim()
}

export function normalizePdiImportRow(row: PdiWorkbookRow) {
  return {
    title: normalizePdiCell(row.Title),
    disciplineCode: normalizePdiCell(row.DisciplineCode).toUpperCase(),
    documentTypeCode: normalizePdiCell(row.DocumentTypeCode).toUpperCase(),
    releasePurposeCode: normalizePdiCell(row.ReleasePurposeCode).toUpperCase(),
    revision: normalizePdiCell(row.Revision) || "00",
    remarks: normalizePdiCell(row.Remarks) || undefined,
    tags: normalizePdiCell(row.Tags) || undefined,
    clientDocumentNumber:
      normalizePdiCell(row.ClientDocumentNumber) || undefined,
  }
}

export function writePdiWorkbook(rows: PdiWorkbookRow[]) {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(workbook, worksheet, "PDI")

  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  }) as Buffer
}

export function readPdiWorkbookRows(
  workbookBytes: ArrayBuffer | Uint8Array | Buffer
) {
  const workbook = XLSX.read(workbookBytes, {
    type: "array",
  })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]

  if (!worksheet) {
    throw new Error("The workbook does not contain a readable worksheet.")
  }

  return XLSX.utils.sheet_to_json<PdiWorkbookRow>(worksheet, {
    defval: "",
  })
}
