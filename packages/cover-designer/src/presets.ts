import type { CoverBinding, CoverElement, CoverTemplateDocument } from "./index"

type ElementProperties = CoverElement["properties"]

function staticText(
  id: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  properties: ElementProperties = {}
): CoverElement {
  return {
    id,
    type: "STATIC_TEXT",
    text,
    x,
    y,
    width,
    height,
    zIndex: 2,
    properties,
  }
}

function boundText(
  id: string,
  binding: CoverBinding,
  x: number,
  y: number,
  width: number,
  height: number,
  properties: ElementProperties = {}
): CoverElement {
  return {
    id,
    type: "BOUND_TEXT",
    binding,
    x,
    y,
    width,
    height,
    zIndex: 3,
    properties,
  }
}

function rectangle(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  borderWidth = 1
): CoverElement {
  return {
    id,
    type: "RECTANGLE",
    x,
    y,
    width,
    height,
    zIndex: 1,
    locked: true,
    properties: { borderWidth },
  }
}

function line(
  id: string,
  x: number,
  y: number,
  width: number,
  height = 0.001
): CoverElement {
  return {
    id,
    type: "LINE",
    x,
    y,
    width,
    height,
    zIndex: 1,
    locked: true,
    properties: { thickness: 0.7 },
  }
}

function signature(
  id: string,
  roleLabel: string,
  step: string,
  x: number,
  y: number,
  width: number,
  height: number
): CoverElement {
  return {
    id,
    type: "SIGNATURE_BOX",
    workflowStepKey: step,
    roleLabel,
    x,
    y,
    width,
    height,
    zIndex: 3,
  }
}

const clientLogo: CoverElement = {
  id: "client-logo",
  type: "IMAGE",
  binding: "client.logo",
  x: 0.055,
  y: 0.035,
  width: 0.2,
  height: 0.075,
  zIndex: 4,
}

export const JIGPC_DOCUMENT_DETAILS_COVER: CoverTemplateDocument = {
  schemaVersion: "1",
  page: { size: "A4", orientation: "PORTRAIT" },
  grid: { enabled: true, size: 0.005, snapping: true },
  elements: [
    clientLogo,
    staticText("jigpc-title", "DOCUMENT DETAILS", 0.28, 0.045, 0.44, 0.04, {
      fontSize: 15,
      bold: true,
    }),
    rectangle("jigpc-document-box", 0.055, 0.125, 0.89, 0.23, 1.2),
    staticText("jigpc-project-label", "Project", 0.07, 0.145, 0.16, 0.025, {
      fontSize: 8,
      bold: true,
    }),
    boundText("jigpc-project", "project.name", 0.25, 0.14, 0.67, 0.035, {
      fontSize: 10,
      bold: true,
    }),
    line("jigpc-project-line", 0.055, 0.18, 0.89),
    staticText("jigpc-doc-label", "Document number", 0.07, 0.195, 0.16, 0.025, {
      fontSize: 8,
      bold: true,
    }),
    boundText("jigpc-doc-number", "document.number", 0.25, 0.19, 0.42, 0.035, {
      fontSize: 10,
      bold: true,
    }),
    staticText("jigpc-rev-label", "Revision", 0.69, 0.195, 0.09, 0.025, {
      fontSize: 8,
      bold: true,
    }),
    boundText("jigpc-revision", "document.revision", 0.8, 0.19, 0.12, 0.035, {
      fontSize: 10,
      bold: true,
    }),
    line("jigpc-number-line", 0.055, 0.23, 0.89),
    staticText(
      "jigpc-title-label",
      "Document title",
      0.07,
      0.245,
      0.16,
      0.025,
      {
        fontSize: 8,
        bold: true,
      }
    ),
    boundText(
      "jigpc-document-title",
      "document.title",
      0.25,
      0.24,
      0.67,
      0.055,
      {
        fontSize: 10,
        bold: true,
      }
    ),
    line("jigpc-title-line", 0.055, 0.305, 0.89),
    staticText(
      "jigpc-client-number-label",
      "Client document number",
      0.07,
      0.318,
      0.2,
      0.025,
      {
        fontSize: 8,
        bold: true,
      }
    ),
    boundText(
      "jigpc-client-number",
      "document.clientNumber",
      0.29,
      0.313,
      0.38,
      0.035,
      {
        fontSize: 9,
      }
    ),
    staticText("jigpc-date-label", "Date", 0.7, 0.318, 0.08, 0.025, {
      fontSize: 8,
      bold: true,
    }),
    boundText("jigpc-date", "document.date", 0.79, 0.313, 0.13, 0.035, {
      fontSize: 9,
    }),
    staticText(
      "jigpc-submittal-heading",
      "SUBMITTAL DETAILS",
      0.055,
      0.38,
      0.4,
      0.03,
      {
        fontSize: 11,
        bold: true,
      }
    ),
    rectangle("jigpc-submittal-box", 0.055, 0.415, 0.89, 0.12),
    staticText(
      "jigpc-purpose-label",
      "Release purpose",
      0.07,
      0.435,
      0.16,
      0.025,
      {
        fontSize: 8,
        bold: true,
      }
    ),
    boundText(
      "jigpc-purpose",
      "document.releasePurpose",
      0.25,
      0.43,
      0.28,
      0.035,
      {
        fontSize: 9,
      }
    ),
    staticText(
      "jigpc-discipline-label",
      "Discipline",
      0.56,
      0.435,
      0.12,
      0.025,
      {
        fontSize: 8,
        bold: true,
      }
    ),
    boundText(
      "jigpc-discipline",
      "document.discipline",
      0.69,
      0.43,
      0.23,
      0.035,
      {
        fontSize: 9,
      }
    ),
    line("jigpc-submittal-line", 0.055, 0.475, 0.89),
    staticText("jigpc-type-label", "Document type", 0.07, 0.49, 0.16, 0.025, {
      fontSize: 8,
      bold: true,
    }),
    boundText("jigpc-type", "document.type", 0.25, 0.485, 0.67, 0.035, {
      fontSize: 9,
    }),
    staticText(
      "jigpc-revision-heading",
      "REVISION HISTORY",
      0.055,
      0.56,
      0.4,
      0.03,
      {
        fontSize: 11,
        bold: true,
      }
    ),
    rectangle("jigpc-revision-box", 0.055, 0.595, 0.89, 0.17),
    signature(
      "jigpc-prepared",
      "Prepared By Manager",
      "prepared",
      0.07,
      0.615,
      0.25,
      0.125
    ),
    signature(
      "jigpc-reviewed",
      "Reviewed By",
      "reviewed",
      0.375,
      0.615,
      0.25,
      0.125
    ),
    signature(
      "jigpc-approved",
      "Approved By",
      "approved",
      0.68,
      0.615,
      0.25,
      0.125
    ),
    staticText(
      "jigpc-status-heading",
      "CLIENT REVIEW STATUS",
      0.055,
      0.79,
      0.4,
      0.03,
      {
        fontSize: 11,
        bold: true,
      }
    ),
    {
      id: "jigpc-response-legend",
      type: "CLIENT_RESPONSE_LEGEND",
      x: 0.055,
      y: 0.825,
      width: 0.6,
      height: 0.11,
      zIndex: 2,
    },
    {
      id: "jigpc-verification",
      type: "QR_CODE",
      binding: "verification.qr",
      x: 0.78,
      y: 0.815,
      width: 0.14,
      height: 0.11,
      zIndex: 3,
    },
    staticText(
      "jigpc-footer",
      "Controlled document cover sheet",
      0.055,
      0.955,
      0.89,
      0.02,
      {
        fontSize: 7,
      }
    ),
  ],
}

export const AIR_PRODUCTS_DOCUMENT_COVER: CoverTemplateDocument = {
  schemaVersion: "1",
  page: { size: "A4", orientation: "PORTRAIT" },
  grid: { enabled: true, size: 0.005, snapping: true },
  elements: [
    { ...clientLogo, id: "air-products-client-logo", width: 0.26 },
    staticText(
      "air-products-title",
      "DOCUMENT COVER SHEET",
      0.51,
      0.05,
      0.43,
      0.04,
      {
        fontSize: 15,
        bold: true,
      }
    ),
    rectangle("air-products-release-box", 0.055, 0.13, 0.89, 0.09, 1.2),
    staticText(
      "air-products-release-label",
      "Release purpose",
      0.07,
      0.15,
      0.18,
      0.025,
      {
        fontSize: 8,
        bold: true,
      }
    ),
    boundText(
      "air-products-release",
      "document.releasePurpose",
      0.27,
      0.145,
      0.65,
      0.04,
      {
        fontSize: 11,
        bold: true,
      }
    ),
    staticText(
      "air-products-info-heading",
      "DOCUMENT INFORMATION",
      0.055,
      0.25,
      0.4,
      0.03,
      {
        fontSize: 11,
        bold: true,
      }
    ),
    rectangle("air-products-info-box", 0.055, 0.285, 0.89, 0.25),
    staticText(
      "air-products-project-label",
      "Project",
      0.07,
      0.305,
      0.16,
      0.025,
      {
        fontSize: 8,
        bold: true,
      }
    ),
    boundText("air-products-project", "project.name", 0.25, 0.3, 0.67, 0.035, {
      fontSize: 10,
      bold: true,
    }),
    line("air-products-project-line", 0.055, 0.345, 0.89),
    staticText(
      "air-products-number-label",
      "Document number",
      0.07,
      0.36,
      0.16,
      0.025,
      {
        fontSize: 8,
        bold: true,
      }
    ),
    boundText(
      "air-products-number",
      "document.number",
      0.25,
      0.355,
      0.42,
      0.035,
      {
        fontSize: 10,
        bold: true,
      }
    ),
    staticText(
      "air-products-revision-label",
      "Revision",
      0.7,
      0.36,
      0.09,
      0.025,
      {
        fontSize: 8,
        bold: true,
      }
    ),
    boundText(
      "air-products-revision",
      "document.revision",
      0.8,
      0.355,
      0.12,
      0.035,
      {
        fontSize: 10,
        bold: true,
      }
    ),
    line("air-products-number-line", 0.055, 0.4, 0.89),
    staticText(
      "air-products-title-label",
      "Document title",
      0.07,
      0.415,
      0.16,
      0.025,
      {
        fontSize: 8,
        bold: true,
      }
    ),
    boundText(
      "air-products-document-title",
      "document.title",
      0.25,
      0.41,
      0.67,
      0.055,
      {
        fontSize: 10,
        bold: true,
      }
    ),
    line("air-products-title-line", 0.055, 0.475, 0.89),
    staticText(
      "air-products-client-number-label",
      "Client document number",
      0.07,
      0.49,
      0.2,
      0.025,
      {
        fontSize: 8,
        bold: true,
      }
    ),
    boundText(
      "air-products-client-number",
      "document.clientNumber",
      0.29,
      0.485,
      0.38,
      0.035,
      {
        fontSize: 9,
      }
    ),
    staticText("air-products-date-label", "Date", 0.7, 0.49, 0.08, 0.025, {
      fontSize: 8,
      bold: true,
    }),
    boundText("air-products-date", "document.date", 0.79, 0.485, 0.13, 0.035, {
      fontSize: 9,
    }),
    staticText(
      "air-products-review-heading",
      "REVIEW STATUS",
      0.055,
      0.565,
      0.4,
      0.03,
      {
        fontSize: 11,
        bold: true,
      }
    ),
    rectangle("air-products-review-box", 0.055, 0.6, 0.89, 0.15),
    signature(
      "air-products-prepared",
      "Prepared By Manager",
      "prepared",
      0.07,
      0.62,
      0.26,
      0.105
    ),
    signature(
      "air-products-reviewed",
      "Client Reviewer",
      "reviewed",
      0.37,
      0.62,
      0.26,
      0.105
    ),
    signature(
      "air-products-approved",
      "Approval",
      "approved",
      0.67,
      0.62,
      0.26,
      0.105
    ),
    staticText(
      "air-products-status-heading",
      "STATUS CODE LEGEND",
      0.055,
      0.78,
      0.4,
      0.03,
      {
        fontSize: 11,
        bold: true,
      }
    ),
    {
      id: "air-products-response-legend",
      type: "CLIENT_RESPONSE_LEGEND",
      x: 0.055,
      y: 0.815,
      width: 0.61,
      height: 0.11,
      zIndex: 2,
    },
    {
      id: "air-products-verification",
      type: "QR_CODE",
      binding: "verification.qr",
      x: 0.79,
      y: 0.805,
      width: 0.13,
      height: 0.11,
      zIndex: 3,
    },
    staticText(
      "air-products-footer",
      "Purchase order document control",
      0.055,
      0.955,
      0.89,
      0.02,
      {
        fontSize: 7,
      }
    ),
  ],
}

export const COVER_TEMPLATE_PRESETS = [
  {
    id: "JIGPC_DOCUMENT_DETAILS",
    label: "JIGPC document details",
    description:
      "Structured from JIGCC-DUR-A61-DM-LST-00002_00.xlsx with document, submittal, revision, and client-status sections.",
    template: JIGPC_DOCUMENT_DETAILS_COVER,
  },
  {
    id: "AIR_PRODUCTS_DOCUMENT_COVER",
    label: "Air Products document cover",
    description:
      "Structured from EN240444-DTGSTG-WM4-00002 with release purpose, document information, review status, and response legend.",
    template: AIR_PRODUCTS_DOCUMENT_COVER,
  },
] as const

export type CoverTemplatePresetId =
  (typeof COVER_TEMPLATE_PRESETS)[number]["id"]

export function getCoverTemplatePreset(id?: string) {
  return COVER_TEMPLATE_PRESETS.find((preset) => preset.id === id) ?? null
}
