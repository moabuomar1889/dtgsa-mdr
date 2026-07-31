"use client"

import { useEffect } from "react"

// Root-layout failures are not covered by segment error boundaries, so this
// renders its own document shell with inline styling only.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error("mdr-web root error", error)
  }, [error])

  return (
    <html lang="en" data-theme="dark">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0d12",
          color: "#e6e8ee",
          fontFamily: "system-ui, sans-serif",
          padding: "40px 20px",
        }}
      >
        <main style={{ maxWidth: "34rem" }}>
          <p
            style={{
              fontSize: "10px",
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              color: "#9184d9",
              margin: 0,
            }}
          >
            Application error
          </p>
          <h1 style={{ fontSize: "22px", fontWeight: 500, margin: "8px 0 0" }}>
            DTGSA MDR could not start this page
          </h1>
          <p
            style={{ fontSize: "13px", lineHeight: 1.6, color: "#9aa1b2" }}
          >
            The application shell failed to render. Retry the request, or sign
            in again if the problem persists.
          </p>
          {error.digest ? (
            <p style={{ fontSize: "11px", color: "#6f7688", fontFamily: "monospace" }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              marginTop: "20px",
              border: "1px solid #9184d9",
              background: "transparent",
              color: "#e6e8ee",
              borderRadius: "7px",
              padding: "8px 16px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
