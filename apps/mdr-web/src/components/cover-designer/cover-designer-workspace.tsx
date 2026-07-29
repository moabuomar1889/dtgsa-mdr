"use client"

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
}: {
  versionId: string
  initialTemplate: CoverTemplateDocument
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
    <div className="grid min-h-[760px] overflow-hidden rounded-[28px] border border-slate-800 bg-[#0d1719] text-slate-100 shadow-2xl xl:grid-cols-[240px_minmax(0,1fr)_280px]">
      <aside className="border-b border-slate-800 bg-[#101d20] p-4 xl:border-r xl:border-b-0">
        <p className="text-xs font-semibold tracking-[0.22em] text-teal-300 uppercase">
          Element library
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-1">
          {[
            ["STATIC_TEXT", "Static text"],
            ["BOUND_TEXT", "Bound field"],
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
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-left text-xs text-slate-200 transition hover:border-teal-400 hover:bg-teal-400/10"
            >
              <Plus className="size-3.5 text-teal-300" />
              {label}
            </button>
          ))}
        </div>
        <div className="mt-6 border-t border-slate-800 pt-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-amber-300 uppercase">
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
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs ${
                    state.selectedIds.includes(element.id)
                      ? "bg-teal-400/15 text-teal-200"
                      : "text-slate-400 hover:bg-slate-800"
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
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-[#132326] px-4 py-3">
          <button
            type="button"
            onClick={() => dispatch({ type: "UNDO" })}
            className="rounded-lg p-2 hover:bg-slate-700"
            title="Undo"
          >
            <Undo2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "REDO" })}
            className="rounded-lg p-2 hover:bg-slate-700"
            title="Redo"
          >
            <Redo2 className="size-4" />
          </button>
          <span className="mx-1 h-5 w-px bg-slate-700" />
          <button
            type="button"
            onClick={() =>
              dispatch({ type: "DUPLICATE", ids: state.selectedIds })
            }
            className="rounded-lg p-2 hover:bg-slate-700"
            title="Duplicate"
          >
            <Copy className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "DELETE", ids: state.selectedIds })}
            className="rounded-lg p-2 hover:bg-red-500/20 hover:text-red-300"
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
            className="rounded-lg p-2 hover:bg-slate-700"
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
            className="rounded-lg p-2 hover:bg-slate-700"
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
            className="rounded-lg p-2 hover:bg-slate-700"
            title="Align center"
          >
            <AlignCenter className="size-4" />
          </button>
          <span className="ml-auto text-xs text-slate-400">{message}</span>
          <button
            type="button"
            onClick={() => setPreview((value) => !value)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${
              preview
                ? "bg-amber-300 text-slate-950"
                : "border border-slate-600 text-slate-200"
            }`}
          >
            Preview sample
          </button>
          <button
            type="button"
            onClick={save}
            className="flex items-center gap-2 rounded-xl bg-teal-400 px-3 py-2 text-xs font-bold text-slate-950"
          >
            <Save className="size-4" /> Save
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={issues.length > 0}
            className="flex items-center gap-2 rounded-xl bg-amber-300 px-3 py-2 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="size-4" /> Publish
          </button>
        </div>

        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-2 text-xs text-slate-400">
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

        <div className="min-h-[680px] overflow-auto bg-[radial-gradient(circle_at_top,#1d3438_0,#0b1416_65%)] p-10">
          <div
            ref={canvasRef}
            onPointerMove={moveDrag}
            onPointerUp={() => {
              dragRef.current = null
            }}
            className="relative mx-auto overflow-hidden bg-[#f7f4ea] text-slate-900 shadow-[0_35px_90px_rgba(0,0,0,.48)]"
            style={{
              width: dimensions.width * zoom,
              height: dimensions.height * zoom,
              backgroundImage: state.present.grid.enabled
                ? "linear-gradient(rgba(15,118,110,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(15,118,110,.12) 1px,transparent 1px)"
                : undefined,
              backgroundSize: `${state.present.grid.size * 100}% ${
                state.present.grid.size * 100
              }%`,
            }}
          >
            {centerGuide ? (
              <div className="pointer-events-none absolute inset-y-0 left-1/2 z-[999] w-px bg-amber-500" />
            ) : null}
            {state.present.elements.map((element) => (
              <div
                key={element.id}
                onPointerDown={(event) => beginDrag(event, element)}
                className={`absolute cursor-move overflow-hidden border p-1 text-[10px] leading-tight whitespace-pre-line ${
                  state.selectedIds.includes(element.id)
                    ? "border-teal-600 ring-2 ring-teal-400/50"
                    : "border-slate-400/60"
                } ${element.locked ? "cursor-not-allowed opacity-80" : ""}`}
                style={{
                  left: `${element.x * 100}%`,
                  top: `${element.y * 100}%`,
                  width: `${element.width * 100}%`,
                  height: `${element.height * 100}%`,
                  zIndex: element.zIndex,
                }}
              >
                {elementLabel(element, preview)}
              </div>
            ))}
          </div>
        </div>
      </main>

      <aside className="border-t border-slate-800 bg-[#101d20] p-4 xl:border-t-0 xl:border-l">
        <p className="text-xs font-semibold tracking-[0.22em] text-teal-300 uppercase">
          Inspector
        </p>
        {primary ? (
          <div className="mt-4 space-y-4 text-xs">
            <div>
              <label className="text-slate-400">Element</label>
              <p className="mt-1 font-semibold text-slate-100">{primary.id}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["x", "y", "width", "height"] as const).map((field) => (
                <label key={field} className="text-slate-400">
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
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-100"
                  />
                </label>
              ))}
            </div>
            {primary.type === "STATIC_TEXT" ? (
              <label className="block text-slate-400">
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
                  className="mt-1 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-100"
                />
              </label>
            ) : null}
            {primary.type === "BOUND_TEXT" ||
            primary.type === "PACKAGE_HASH" ? (
              <label className="block text-slate-400">
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
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-100"
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
            {primary.type === "SIGNATURE_BOX" ? (
              <>
                <label className="block text-slate-400">
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
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-100"
                  />
                </label>
                <label className="block text-slate-400">
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
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-100"
                  />
                </label>
              </>
            ) : null}
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-slate-400">
              <p className="flex items-center gap-2 text-slate-200">
                <Grid3X3 className="size-3.5" /> Relative coordinates
              </p>
              <p className="mt-2 leading-5">
                Drag with snapping. Hold Shift while selecting to build a
                multi-selection.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 p-4 text-xs leading-5 text-slate-500">
            Select one or more elements to edit coordinates, bindings, layers,
            and lock state.
          </div>
        )}
        <div className="mt-6 border-t border-slate-800 pt-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-amber-300 uppercase">
            Validation
          </p>
          {issues.length === 0 ? (
            <p className="mt-3 rounded-xl bg-teal-400/10 p-3 text-xs text-teal-200">
              Ready to publish
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {issues.map((issue, index) => (
                <p
                  key={`${issue.code}-${index}`}
                  className="rounded-xl bg-amber-300/10 p-3 text-xs text-amber-200"
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
