import assert from "node:assert/strict"
import { test } from "node:test"
import {
  PDI_EXPORT_COLUMNS,
  normalizePdiImportRow,
  normalizePdiTitleKey,
} from "../../apps/mdr-web/src/lib/pdi/excel"

test("the exported workbook carries the internal number the import matches on", () => {
  assert.ok(
    PDI_EXPORT_COLUMNS.includes("DtgsaDocumentNumber"),
    "the round trip is impossible unless the internal number is exported"
  )
  assert.ok(PDI_EXPORT_COLUMNS.includes("ClientDocumentNumber"))
})

test("the import reads the internal number back", () => {
  const row = normalizePdiImportRow({
    DtgsaDocumentNumber: " LOCAL-ALPHA-ELE-DRW-0001 ",
    Title: "Single-line diagram",
    ClientDocumentNumber: " SYN-CLIENT-001 ",
    DisciplineCode: "ele",
    DocumentTypeCode: "drw",
    ReleasePurposeCode: "ifr",
  })

  // Reading this field is what separates reconciliation from duplication.
  assert.equal(row.dtgsaDocumentNumber, "LOCAL-ALPHA-ELE-DRW-0001")
  assert.equal(row.clientDocumentNumber, "SYN-CLIENT-001")
  assert.equal(row.disciplineCode, "ELE")
})

test("a row with no internal number is treated as a new line", () => {
  const row = normalizePdiImportRow({
    Title: "Newly requested drawing",
    DisciplineCode: "PIP",
    DocumentTypeCode: "DWG",
    ReleasePurposeCode: "IFC",
  })

  assert.equal(row.dtgsaDocumentNumber, "")
})

test("title matching tolerates spacing and case but not different words", () => {
  assert.equal(
    normalizePdiTitleKey("  Single-Line   Diagram "),
    normalizePdiTitleKey("single-line diagram")
  )
  assert.notEqual(
    normalizePdiTitleKey("Single-line diagram"),
    normalizePdiTitleKey("Single-line diagram Rev B")
  )
})
