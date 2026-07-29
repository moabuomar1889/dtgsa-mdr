import assert from "node:assert/strict"
import { test } from "node:test"
import {
  DEFAULT_COVER_TEMPLATE,
  coverDesignerReducer,
  pageDimensions,
  resolveCoverInheritance,
  stableCoverSnapshot,
  toAbsoluteLayout,
  validateCoverTemplate,
  validateImageInput,
  type CoverTemplateDocument,
} from "../../packages/cover-designer/src/index"
import { renderCoverTemplatePdf } from "../../packages/pdf-engine/src/index"

test("cover inheritance resolves organization through discipline specificity", () => {
  const publishedAt = new Date("2026-07-29T00:00:00Z")
  const resolved = resolveCoverInheritance(
    [
      {
        templateId: "org",
        versionId: "org-v1",
        scopeType: "ORGANIZATION",
        priority: 100,
        publishedAt,
      },
      {
        templateId: "client",
        versionId: "client-v1",
        scopeType: "CLIENT",
        scopeId: "client-1",
        priority: 0,
        publishedAt,
      },
      {
        templateId: "project",
        versionId: "project-v1",
        scopeType: "PROJECT",
        scopeId: "project-1",
        priority: 0,
        publishedAt,
      },
      {
        templateId: "discipline",
        versionId: "discipline-v1",
        scopeType: "DISCIPLINE",
        scopeId: "arc",
        priority: 0,
        publishedAt,
      },
    ],
    {
      clientId: "client-1",
      projectId: "project-1",
      disciplineId: "arc",
    }
  )
  assert.equal(resolved?.versionId, "discipline-v1")
})

test("A4, A3, custom, and orientation dimensions remain resolution independent", () => {
  assert.deepEqual(pageDimensions(DEFAULT_COVER_TEMPLATE.page), {
    width: 595.28,
    height: 841.89,
  })
  assert.deepEqual(pageDimensions({ size: "A3", orientation: "LANDSCAPE" }), {
    width: 1190.55,
    height: 841.89,
  })
  assert.deepEqual(
    pageDimensions({
      size: "CUSTOM",
      orientation: "PORTRAIT",
      customWidthPt: 720,
      customHeightPt: 900,
    }),
    { width: 720, height: 900 }
  )
  const absolute = toAbsoluteLayout(DEFAULT_COVER_TEMPLATE)
  assert.equal(absolute.elements[0]!.x, 0.08 * 595.28)
})

test("publish validation requires allowlisted fields and formal Prepared By box", () => {
  assert.deepEqual(validateCoverTemplate(DEFAULT_COVER_TEMPLATE), [])
  const missingPrepared = {
    ...DEFAULT_COVER_TEMPLATE,
    elements: DEFAULT_COVER_TEMPLATE.elements.filter(
      (element) => element.workflowStepKey !== "prepared"
    ),
  }
  assert.ok(
    validateCoverTemplate(missingPrepared).some(
      (issue) => issue.code === "MISSING_PREPARED_BY"
    )
  )
  const invalid = structuredClone(DEFAULT_COVER_TEMPLATE)
  invalid.elements[0]!.binding =
    "runtime.execute" as (typeof invalid.elements)[number]["binding"]
  assert.ok(
    validateCoverTemplate(invalid).some(
      (issue) => issue.code === "INVALID_BINDING"
    )
  )
})

test("multiple manager signature boxes and client legend remain configurable", () => {
  const template: CoverTemplateDocument = {
    ...structuredClone(DEFAULT_COVER_TEMPLATE),
    elements: [
      ...structuredClone(DEFAULT_COVER_TEMPLATE.elements),
      {
        id: "manager-two",
        type: "SIGNATURE_BOX",
        workflowStepKey: "manager-2",
        roleLabel: "Additional Manager",
        x: 0.52,
        y: 0.68,
        width: 0.4,
        height: 0.16,
        zIndex: 4,
      },
      {
        id: "legend",
        type: "CLIENT_RESPONSE_LEGEND",
        x: 0.08,
        y: 0.48,
        width: 0.84,
        height: 0.16,
        zIndex: 5,
      },
    ],
  }
  assert.deepEqual(validateCoverTemplate(template), [])
  assert.equal(
    template.elements.filter((element) => element.type === "SIGNATURE_BOX")
      .length,
    2
  )
})

test("cover snapshots are stable across object-property order", () => {
  const first = stableCoverSnapshot(DEFAULT_COVER_TEMPLATE)
  const reordered: CoverTemplateDocument = {
    grid: DEFAULT_COVER_TEMPLATE.grid,
    elements: DEFAULT_COVER_TEMPLATE.elements.map((element) => ({
      zIndex: element.zIndex,
      height: element.height,
      width: element.width,
      y: element.y,
      x: element.x,
      type: element.type,
      id: element.id,
      binding: element.binding,
      text: element.text,
      workflowStepKey: element.workflowStepKey,
      roleLabel: element.roleLabel,
    })),
    page: DEFAULT_COVER_TEMPLATE.page,
    schemaVersion: "1",
  }
  assert.equal(first.contentHash, stableCoverSnapshot(reordered).contentHash)
})

test("designer reducer supports duplicate, locked delete, undo, and redo", () => {
  const initial = {
    present: structuredClone(DEFAULT_COVER_TEMPLATE),
    past: [],
    future: [],
    selectedIds: ["document-title"],
  }
  const duplicated = coverDesignerReducer(initial, {
    type: "DUPLICATE",
    ids: ["document-title"],
  })
  assert.equal(duplicated.present.elements.length, 4)
  const undone = coverDesignerReducer(duplicated, { type: "UNDO" })
  assert.equal(undone.present.elements.length, 3)
  const redone = coverDesignerReducer(undone, { type: "REDO" })
  assert.equal(redone.present.elements.length, 4)
  const locked = {
    ...redone,
    present: {
      ...redone.present,
      elements: redone.present.elements.map((element) =>
        element.id === "prepared-by" ? { ...element, locked: true } : element
      ),
    },
  }
  assert.equal(
    coverDesignerReducer(locked, {
      type: "DELETE",
      ids: ["prepared-by"],
    }).present.elements.length,
    4
  )
})

test("active SVG content and oversized images are rejected", () => {
  assert.throws(() =>
    validateImageInput({
      mimeType: "image/svg+xml",
      sizeBytes: 100,
      svgText: '<svg onload="alert(1)"><script/></svg>',
    })
  )
  assert.throws(() =>
    validateImageInput({
      mimeType: "image/png",
      sizeBytes: 6 * 1024 * 1024,
    })
  )
})

test("server PDF rendering is deterministic with QR, signature, and project legend", async () => {
  const template: CoverTemplateDocument = {
    ...structuredClone(DEFAULT_COVER_TEMPLATE),
    elements: [
      ...structuredClone(DEFAULT_COVER_TEMPLATE.elements),
      {
        id: "legend",
        type: "CLIENT_RESPONSE_LEGEND",
        x: 0.08,
        y: 0.45,
        width: 0.84,
        height: 0.18,
        zIndex: 4,
      },
    ],
  }
  const input = {
    template,
    values: {
      "document.title": "Deterministic title",
      "verification.qr": "https://verify.example/ABC123",
    },
    signatures: {
      prepared: {
        name: "Manager Name",
        jobTitle: "Engineering Manager",
        signedAt: "2026-07-29",
        referenceId: "EVIDENCE-1",
        appearanceBytes: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nJ8AAAAASUVORK5CYII=",
          "base64"
        ),
      },
    },
    responseLegend: [
      { externalCode: "A", wording: "Approved", selected: true },
      { externalCode: "R", wording: "Revise and resubmit" },
    ],
  }
  const first = await renderCoverTemplatePdf(input)
  const second = await renderCoverTemplatePdf(input)
  assert.equal(first.outputHash, second.outputHash)
  assert.deepEqual(first.bytes, second.bytes)
  assert.equal(first.bytes.subarray(0, 4).toString(), "%PDF")
  const changed = await renderCoverTemplatePdf({
    ...input,
    responseLegend: [{ externalCode: "1", wording: "Accepted" }],
  })
  assert.notEqual(changed.outputHash, first.outputHash)
})

test("overflow validation fails deterministic rendering", async () => {
  const template = structuredClone(DEFAULT_COVER_TEMPLATE)
  template.elements[0]!.width = 0.05
  template.elements[0]!.height = 0.01
  await assert.rejects(
    renderCoverTemplatePdf({
      template,
      values: { "document.title": "A very long title that cannot fit" },
    }),
    /overflow/
  )
})
