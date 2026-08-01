"use client"

import Image from "next/image"
import { startTransition, useId, useReducer, useRef, useState } from "react"
import {
  COVER_BINDINGS,
  coverDesignerReducer,
  pageDimensions,
  snapRelative,
  validateCoverTemplate,
  type CoverElement,
  type CoverElementType,
  type CoverTemplateDocument,
} from "@dtg/cover-designer"
import {
  publishVisualCoverVersionAction,
  saveVisualCoverDraftAction,
} from "@/server/actions/templates"
import {
  AlignCenter,
  BringToFront,
  Copy,
  Grid3X3,
  Lock,
  Plus,
  Redo2,
  Save,
  Send,
  Trash2,
  Undo2,
  Unlock,
  ZoomIn,
} from "lucide-react"

type DragState = {
  id: string
  startX: number
  startY: number
  originalX: number
  originalY: number
} | null

const sampleValues: Record<string, string> = {
  "document.title": "Process Building General Arrangement",
  "document.number": "DTG-ARC-DWG-00124",
  "document.revision": "Rev 02",
  "client.name": "Sample Client",
  "client.logo": "Client logo",
  "project.name": "North Utilities Expansion",
  "workflow.preparedBy": "Amina Saleh",
  "verification.packageHash": "7e1f...a42c",
}

function elementLabel(element: CoverElement, preview: boolean) {
  if (element.type === "SIGNATURE_BOX") {
    return `${element.roleLabel ?? "Signer"}\n${
      preview
        ? "Amina Saleh\n[Signature]\nDate: 29 Jul 2026"
        : "Workflow signature"
    }`
  }
  if (element.type === "QR_CODE") return "[QR]\nVerification"
  if (element.type === "IMAGE") return "Client logo"
  if (element.type === "RECTANGLE" || element.type === "LINE") return ""
  if (element.type === "CLIENT_RESPONSE_LEGEND") {
    return "Client response legend\nA - Approved\nB - Revise and resubmit"
  }
  return preview && element.binding
    ? (sampleValues[element.binding] ?? element.binding)
    : (element.text ?? element.binding ?? element.type)
}

export function CoverDesignerWorkspace({
  versionId,
  initialTemplate,
  clientLogoUrl,
}: {
  versionId: string
  initialTemplate: CoverTemplateDocument
  clientLogoUrl?: string
}) {
  const [state, dispatch] = useReducer(coverDesignerReducer, {
    present: initialTemplate,
    past: [],
    future: [],
    selectedIds: [],
  })
  const [zoom, setZoom] = useState(0.78)
  const [preview, setPreview] = useState(false)
  const [message, setMessage] = useState("Draft ready")
  const elementIdPrefix = useId()
  const elementSequence = useRef(0)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState>(null)
  const dimensions = pageDimensions(state.present.page)
  const selected = state.present.elements.filter((element) =>
    state.selectedIds.includes(element.id)
  )
  const primary = selected[0]
  const issues = validateCoverTemplate(state.present)
  const centerGuide = selected.some(
    (element) => Math.abs(element.x + element.width / 2 - 0.5) < 0.008
  )

  function addElement(type: CoverElementType) {
    elementSequence.current += 1
    const id = `${type.toLowerCase()}-${elementIdPrefix}-${elementSequence.current}`
    const isSignature = type === "SIGNATURE_BOX"
    dispatch({
      type: "ADD",
      element: {
        id,
        type,
        x: 0.1,
        y: 0.2,
        width: isSignature ? 0.4 : 0.28,
        height: isSignature ? 0.16 : 0.07,
        zIndex:
          Math.max(...state.present.elements.map((item) => item.zIndex), 0) + 1,
        text: type === "STATIC_TEXT" ? "New text" : undefined,
        binding: type === "IMAGE" ? "client.logo" : undefined,
        workflowStepKey: isSignature ? "reviewed" : undefined,
        roleLabel: isSignature ? "Reviewer" : undefined,
      },
    })
  }

  function beginDrag(
    event: React.PointerEvent<HTMLDivElement>,
    element: CoverElement
  ) {
    if (element.locked) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      id: element.id,
      startX: event.clientX,
      startY: event.clientY,
      originalX: element.x,
      originalY: element.y,
    }
    const ids = event.shiftKey
      ? [...new Set([...state.selectedIds, element.id])]
      : [element.id]
    dispatch({ type: "SELECT", ids })
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    const canvas = canvasRef.current
    if (!drag || !canvas) return
    const rect = canvas.getBoundingClientRect()
    const element = state.present.elements.find((item) => item.id === drag.id)
    if (!element) return
    const grid = state.present.grid.snapping ? state.present.grid.size : 0
    const x = snapRelative(
      drag.originalX + (event.clientX - drag.startX) / rect.width,
      grid
    )
    const y = snapRelative(
      drag.originalY + (event.clientY - drag.startY) / rect.height,
      grid
    )
    dispatch({
      type: "UPDATE",
      ids: [drag.id],
      changes: {
        x: Math.min(1 - element.width, x),
        y: Math.min(1 - element.height, y),
      },
    })
  }

  function save() {
    setMessage("Saving...")
    startTransition(async () => {
      try {
        const result = await saveVisualCoverDraftAction(
          versionId,
          state.present
        )
        setMessage(
          result.issues.length
            ? `Saved with ${result.issues.length} validation issue(s)`
            : `Saved ${result.contentHash?.slice(0, 12)}`
        )
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Save failed")
      }
    })
  }

  function publish() {
    setMessage("Validating and publishing...")
    startTransition(async () => {
      try {
        await publishVisualCoverVersionAction(versionId)
        setMessage("Published and immutable")
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Publish failed")
      }
    })
  }

  return (
    <div className="border-line bg-panel text-text grid min-h-[760px] overflow-hidden rounded-[9px] border shadow-[var(--shadow)] xl:grid-cols-[240px_minmax(0,1fr)_280px]">
      <aside className="border-line bg-panel2 border-b p-4 xl:border-r xl:border-b-0">
        <p className="text-accent-txt text-xs font-semibold tracking-[0.22em] uppercase">
          Element library
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-1">
          {[
            ["STATIC_TEXT", "Static text"],
            ["BOUND_TEXT", "Bound field"],
            ["IMAGE", "Client logo"],
            ["RECTANGLE", "Rectangle"],
            ["LINE", "Line"],
            ["SIGNATURE_BOX", "Signature box"],
            ["CLIENT_RESPONSE_LEGEND", "Response legend"],
            ["QR_CODE", "QR verification"],
            ["PACKAGE_HASH", "Package Hash"],
          ].map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() => addElement(type as CoverElementType)}
              className="border-edge bg-raise text-muted hover:border-accent hover:bg-accent-bg flex items-center gap-2 rounded-[10px] border px-3 py-2 text-left text-xs transition"
            >
              <Plus className="text-accent-txt size-3.5" />
              {label}
            </button>
          ))}
        </div>
        <div className="border-line mt-6 border-t pt-4">
          <p className="text-warn text-xs font-semibold tracking-[0.18em] uppercase">
            Layers
          </p>
          <div className="mt-3 max-h-72 space-y-1 overflow-auto">
            {[...state.present.elements]
              .sort((a, b) => b.zIndex - a.zIndex)
              .map((element) => (
                <button
                  key={element.id}
                  type="button"
                  onClick={() =>
                    dispatch({ type: "SELECT", ids: [element.id] })
                  }
                  className={`flex w-full items-center justify-between rounded-[9px] px-2 py-1.5 text-left text-xs ${
                    state.selectedIds.includes(element.id)
                      ? "bg-accent-bg text-accent-txt"
                      : "text-soft hover:bg-accent-bg2"
                  }`}
                >
                  <span className="truncate">{element.id}</span>
                  {element.locked ? <Lock className="size-3" /> : null}
                </button>
              ))}
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <div className="border-line bg-head flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <button
            type="button"
            onClick={() => dispatch({ type: "UNDO" })}
            className="hover:bg-accent-bg2 rounded-[9px] p-2"
            title="Undo"
          >
            <Undo2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "REDO" })}
            className="hover:bg-accent-bg2 rounded-[9px] p-2"
            title="Redo"
          >
            <Redo2 className="size-4" />
          </button>
          <span className="bg-edge mx-1 h-5 w-px" />
          <button
            type="button"
            onClick={() =>
              dispatch({ type: "DUPLICATE", ids: state.selectedIds })
            }
            className="hover:bg-accent-bg2 rounded-[9px] p-2"
            title="Duplicate"
          >
            <Copy className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "DELETE", ids: state.selectedIds })}
            className="hover:bg-bad/10 hover:text-bad rounded-[9px] p-2"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              primary &&
              dispatch({
                type: "UPDATE",
                ids: state.selectedIds,
                changes: { locked: !primary.locked },
              })
            }
            className="hover:bg-accent-bg2 rounded-[9px] p-2"
            title="Lock"
          >
            {primary?.locked ? (
              <Unlock className="size-4" />
            ) : (
              <Lock className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() =>
              dispatch({
                type: "UPDATE",
                ids: state.selectedIds,
                changes: {
                  zIndex:
                    Math.max(
                      ...state.present.elements.map((item) => item.zIndex),
                      0
                    ) + 1,
                },
              })
            }
            className="hover:bg-accent-bg2 rounded-[9px] p-2"
            title="Bring to front"
          >
            <BringToFront className="size-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              dispatch({
                type: "UPDATE",
                ids: state.selectedIds,
                changes: { x: primary ? 0.5 - primary.width / 2 : 0.5 },
              })
            }
            className="hover:bg-accent-bg2 rounded-[9px] p-2"
            title="Align center"
          >
            <AlignCenter className="size-4" />
          </button>
          <span className="text-soft ml-auto text-xs">{message}</span>
          <button
            type="button"
            onClick={() => setPreview((value) => !value)}
            className={`rounded-[10px] px-3 py-2 text-xs font-semibold ${
              preview ? "bg-warn text-bg" : "border-edge text-muted border"
            }`}
          >
            Preview sample
          </button>
          <button
            type="button"
            onClick={save}
            className="bg-accent text-bg flex items-center gap-2 rounded-[10px] px-3 py-2 text-xs font-bold"
          >
            <Save className="size-4" /> Save
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={issues.length > 0}
            className="bg-warn text-bg flex items-center gap-2 rounded-[10px] px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="size-4" /> Publish
          </button>
        </div>

        <div className="border-line text-soft flex items-center gap-3 border-b px-4 py-2 text-xs">
          <Grid3X3 className="size-4" />
          <span>
            {state.present.page.size} · {state.present.page.orientation}
          </span>
          <ZoomIn className="ml-auto size-4" />
          <input
            type="range"
            min="0.45"
            max="1.15"
            step="0.05"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
          <span>{Math.round(zoom * 100)}%</span>
        </div>

        <div className="bg-bg min-h-[680px] overflow-auto p-10">
          <div
            ref={canvasRef}
            onPointerMove={moveDrag}
            onPointerUp={() => {
              dragRef.current = null
            }}
            className="bg-raise text-text relative mx-auto overflow-hidden shadow-[var(--shadow)]"
            style={{
              width: dimensions.width * zoom,
              height: dimensions.height * zoom,
            }}
          >
            {centerGuide ? (
              <div className="bg-warn pointer-events-none absolute inset-y-0 left-1/2 z-[999] w-px" />
            ) : null}
            {state.present.elements.map((element) => (
              <div
                key={element.id}
                onPointerDown={(event) => beginDrag(event, element)}
                className={`absolute cursor-move overflow-hidden p-1 text-[10px] leading-tight whitespace-pre-line ${
                  state.selectedIds.includes(element.id)
                    ? "border-accent ring-accent-line border ring-2"
                    : element.type === "RECTANGLE"
                      ? "border-edge border"
                      : element.type === "LINE"
                        ? "border-edge border-t"
                        : "border border-transparent"
                } ${element.locked ? "cursor-not-allowed opacity-80" : ""}`}
                style={{
                  left: `${element.x * 100}%`,
                  top: `${element.y * 100}%`,
                  width: `${element.width * 100}%`,
                  height: `${element.height * 100}%`,
                  zIndex: element.zIndex,
                }}
              >
                {element.type === "IMAGE" && clientLogoUrl ? (
                  <Image
                    src={clientLogoUrl}
                    alt="Client logo"
                    fill
                    unoptimized
                    sizes="240px"
                    className="object-contain"
                  />
                ) : (
                  elementLabel(element, preview)
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <aside className="border-line bg-panel2 border-t p-4 xl:border-t-0 xl:border-l">
        <p className="text-accent-txt text-xs font-semibold tracking-[0.22em] uppercase">
          Inspector
        </p>
        {primary ? (
          <div className="mt-4 space-y-4 text-xs">
            <div>
              <label className="text-soft">Element</label>
              <p className="text-text mt-1 font-semibold">{primary.id}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["x", "y", "width", "height"] as const).map((field) => (
                <label key={field} className="text-soft">
                  {field}
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={primary[field]}
                    onChange={(event) =>
                      dispatch({
                        type: "UPDATE",
                        ids: state.selectedIds,
                        changes: { [field]: Number(event.target.value) },
                      })
                    }
                    className="border-edge bg-raise text-text mt-1 w-full rounded-[9px] border px-2 py-1.5"
                  />
                </label>
              ))}
            </div>
            {primary.type === "STATIC_TEXT" ? (
              <label className="text-soft block">
                Text
                <textarea
                  value={primary.text ?? ""}
                  onChange={(event) =>
                    dispatch({
                      type: "UPDATE",
                      ids: state.selectedIds,
                      changes: { text: event.target.value },
                    })
                  }
                  className="border-edge bg-raise text-text mt-1 min-h-20 w-full rounded-[9px] border p-2"
                />
              </label>
            ) : null}
            {primary.type === "BOUND_TEXT" ||
            primary.type === "IMAGE" ||
            primary.type === "PACKAGE_HASH" ? (
              <label className="text-soft block">
                Binding
                <select
                  value={primary.binding ?? ""}
                  onChange={(event) =>
                    dispatch({
                      type: "UPDATE",
                      ids: state.selectedIds,
                      changes: {
                        binding: event.target.value as CoverElement["binding"],
                      },
                    })
                  }
                  className="border-edge bg-raise text-text mt-1 w-full rounded-[9px] border p-2"
                >
                  <option value="">Choose field</option>
                  {COVER_BINDINGS.map((binding) => (
                    <option key={binding} value={binding}>
                      {binding}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {primary.type === "STATIC_TEXT" || primary.type === "BOUND_TEXT" ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-soft block">
                  Font size
                  <input
                    type="number"
                    min="6"
                    max="36"
                    step="1"
                    value={Number(primary.properties?.fontSize ?? 10)}
                    onChange={(event) =>
                      dispatch({
                        type: "UPDATE",
                        ids: state.selectedIds,
                        changes: {
                          properties: {
                            ...primary.properties,
                            fontSize: Number(event.target.value),
                          },
                        },
                      })
                    }
                    className="border-edge bg-raise text-text mt-1 w-full rounded-[9px] border p-2"
                  />
                </label>
                <label className="text-soft flex items-end gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={primary.properties?.bold === true}
                    onChange={(event) =>
                      dispatch({
                        type: "UPDATE",
                        ids: state.selectedIds,
                        changes: {
                          properties: {
                            ...primary.properties,
                            bold: event.target.checked,
                          },
                        },
                      })
                    }
                  />
                  Bold
                </label>
              </div>
            ) : null}
            {primary.type === "SIGNATURE_BOX" ? (
              <>
                <label className="text-soft block">
                  Workflow step
                  <input
                    value={primary.workflowStepKey ?? ""}
                    onChange={(event) =>
                      dispatch({
                        type: "UPDATE",
                        ids: state.selectedIds,
                        changes: { workflowStepKey: event.target.value },
                      })
                    }
                    className="border-edge bg-raise text-text mt-1 w-full rounded-[9px] border p-2"
                  />
                </label>
                <label className="text-soft block">
                  Role label
                  <input
                    value={primary.roleLabel ?? ""}
                    onChange={(event) =>
                      dispatch({
                        type: "UPDATE",
                        ids: state.selectedIds,
                        changes: { roleLabel: event.target.value },
                      })
                    }
                    className="border-edge bg-raise text-text mt-1 w-full rounded-[9px] border p-2"
                  />
                </label>
              </>
            ) : null}
            <div className="border-edge bg-raise text-soft rounded-[10px] border p-3">
              <p className="text-muted flex items-center gap-2">
                <Grid3X3 className="size-3.5" /> Relative coordinates
              </p>
              <p className="mt-2 leading-5">
                Drag with snapping. Hold Shift while selecting to build a
                multi-selection.
              </p>
            </div>
          </div>
        ) : (
          <div className="border-edge text-dim mt-4 rounded-[10px] border border-dashed p-4 text-xs leading-5">
            Select one or more elements to edit coordinates, bindings, layers,
            and lock state.
          </div>
        )}
        <div className="border-line mt-6 border-t pt-4">
          <p className="text-warn text-xs font-semibold tracking-[0.18em] uppercase">
            Validation
          </p>
          {issues.length === 0 ? (
            <p className="bg-accent/10 text-accent-txt mt-3 rounded-[10px] p-3 text-xs">
              Ready to publish
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {issues.map((issue, index) => (
                <p
                  key={`${issue.code}-${index}`}
                  className="bg-warn/10 text-warn rounded-[10px] p-3 text-xs"
                >
                  {issue.message}
                </p>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
