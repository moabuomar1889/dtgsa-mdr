import assert from "node:assert/strict"
import test from "node:test"
import {
  PDI_EXPORT_COLUMNS,
  normalizePdiCell,
  normalizePdiImportRow,
  readPdiWorkbookRows,
  writePdiWorkbook,
} from "@/lib/pdi/excel"
import { createSamplePdiWorkbook } from "../../fixtures/excel/sample-pdi-workbook"

test("PDI workbook round-trip preserves the exported column order and row values", () => {
  const [row] = readPdiWorkbookRows(createSamplePdiWorkbook())

  assert.deepEqual(Object.keys(row), PDI_EXPORT_COLUMNS)
  assert.equal(row.ProjectCode, "PRJ-001")
  assert.equal(row.DtgsaDocumentNumber, "DTG-PRJ-ARC-0001")
  assert.equal(row.ClientDocumentNumber, "CL-001")
})

test("PDI import normalization trims text, uppercases codes, and defaults revision", () => {
  const [row] = readPdiWorkbookRows(createSamplePdiWorkbook())

  assert.deepEqual(normalizePdiImportRow(row), {
    title: "General Arrangement",
    disciplineCode: "ARC",
    documentTypeCode: "DWG",
    releasePurposeCode: "IFR",
    revision: "00",
    remarks: "No confidential data",
    tags: "plan, sanitized",
    clientDocumentNumber: "CL-001",
  })
})

test("PDI import normalization preserves explicit revisions and omits blank optional values", () => {
  assert.deepEqual(
    normalizePdiImportRow({
      Title: "Drawing",
      DisciplineCode: "mec",
      DocumentTypeCode: "dwg",
      ReleasePurposeCode: "ifc",
      Revision: "03",
      Remarks: " ",
      Tags: "",
      ClientDocumentNumber: null,
    }),
    {
      title: "Drawing",
      disciplineCode: "MEC",
      documentTypeCode: "DWG",
      releasePurposeCode: "IFC",
      revision: "03",
      remarks: undefined,
      tags: undefined,
      clientDocumentNumber: undefined,
    }
  )
})

test("PDI cell normalization captures current number and null handling", () => {
  assert.equal(normalizePdiCell(20260729), "20260729")
  assert.equal(normalizePdiCell(null), "")
})

test("PDI workbook reader returns an empty list for a readable empty worksheet", () => {
  assert.deepEqual(readPdiWorkbookRows(writePdiWorkbook([])), [])
})

test("PDI workbook reader currently treats arbitrary text as an empty workbook", () => {
  assert.deepEqual(readPdiWorkbookRows(Buffer.from("not-an-xlsx-workbook")), [])
})
