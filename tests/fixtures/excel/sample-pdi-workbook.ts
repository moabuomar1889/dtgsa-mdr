import { writePdiWorkbook } from "@/lib/pdi/excel"

export async function createSamplePdiWorkbook() {
  return writePdiWorkbook([
    {
      ProjectCode: "PRJ-001",
      ProjectName: "Sanitized Test Project",
      ClientCode: "CLIENT",
      DtgsaDocumentNumber: "DTG-PRJ-ARC-0001",
      ClientDocumentNumber: "CL-001",
      DisciplineCode: "arc",
      DisciplineName: "Architecture",
      DocumentTypeCode: "dwg",
      ReleasePurposeCode: "ifr",
      Title: "  General Arrangement  ",
      Revision: "",
      Status: "Draft",
      Tags: "plan, sanitized",
      Remarks: " No confidential data ",
    },
  ])
}
