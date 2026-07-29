"use client"

import { useEffect, useRef, useState } from "react"
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist"
import { recordPageEventAction } from "./actions"

export function ReviewViewer({
  fileUrl,
  reviewSessionId,
  fileName,
}: {
  fileUrl: string
  reviewSessionId: string
  fileName: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const documentRef = useRef<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [status, setStatus] = useState("Loading controlled first page...")
  const [fit, setFit] = useState<"width" | "page">("width")

  useEffect(() => {
    let cancelled = false
    let renderedPage: PDFPageProxy | null = null
    async function render() {
      try {
        const pdfjs = await import("pdfjs-dist")
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString()
        const loadingTask = pdfjs.getDocument({
          url: fileUrl,
          rangeChunkSize: 1024 * 1024,
          disableAutoFetch: true,
          disableStream: true,
        })
        const document = documentRef.current ?? (await loadingTask.promise)
        if (cancelled) {
          await document.destroy()
          return
        }
        documentRef.current = document
        setPageCount(document.numPages)
        const pageProxy = await document.getPage(page)
        renderedPage = pageProxy
        const canvas = canvasRef.current
        if (!canvas) return
        const parentWidth = canvas.parentElement?.clientWidth ?? 800
        const base = pageProxy.getViewport({ scale: 1 })
        const fitScale =
          fit === "width"
            ? Math.max(0.25, (parentWidth - 32) / base.width)
            : Math.min(
                Math.max(0.25, (parentWidth - 32) / base.width),
                720 / base.height
              )
        const viewport = pageProxy.getViewport({ scale: fitScale * zoom })
        canvas.width = viewport.width
        canvas.height = viewport.height
        const context = canvas.getContext("2d")
        if (!context) throw new Error("Canvas is unavailable.")
        await pageProxy.render({
          canvas,
          canvasContext: context,
          viewport,
        }).promise
        if (!cancelled) {
          setStatus(`Page ${page} rendered from authorized byte ranges.`)
          await recordPageEventAction({
            reviewSessionId,
            pageNumber: page,
            activeSeconds: 1,
          })
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(
            error instanceof Error
              ? `Viewer unavailable: ${error.message}`
              : "Viewer unavailable. Retry when online."
          )
        }
      }
    }
    void render()
    return () => {
      cancelled = true
      renderedPage?.cleanup()
    }
  }, [fileUrl, fit, page, reviewSessionId, zoom])

  useEffect(
    () => () => {
      void documentRef.current?.destroy()
      documentRef.current = null
    },
    []
  )

  return (
    <section className="viewer-shell" aria-label={`Review ${fileName}`}>
      <div className="viewer-toolbar">
        <button
          type="button"
          onClick={() => setPage((value) => Math.max(1, value - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          Previous
        </button>
        <label>
          Page
          <input
            type="number"
            min={1}
            max={pageCount || 1}
            value={page}
            onChange={(event) =>
              setPage(
                Math.min(
                  pageCount || 1,
                  Math.max(1, Number(event.target.value) || 1)
                )
              )
            }
          />
          / {pageCount || "..."}
        </label>
        <button
          type="button"
          onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          disabled={!pageCount || page >= pageCount}
          aria-label="Next page"
        >
          Next
        </button>
        <button type="button" onClick={() => setZoom((value) => value + 0.1)}>
          Zoom in
        </button>
        <button
          type="button"
          onClick={() => setZoom((value) => Math.max(0.5, value - 0.1))}
        >
          Zoom out
        </button>
        <button
          type="button"
          onClick={() =>
            setFit((value) => (value === "width" ? "page" : "width"))
          }
        >
          Fit {fit === "width" ? "page" : "width"}
        </button>
        <a href={fileUrl} download>
          Authorized download
        </a>
      </div>
      <div className="viewer-status" role="status">
        {status}
      </div>
      <div className="viewer-canvas" tabIndex={0}>
        <canvas ref={canvasRef} aria-label={`PDF page ${page}`} />
      </div>
    </section>
  )
}
