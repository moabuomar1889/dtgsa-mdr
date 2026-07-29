"use client"

import { useRef, useState } from "react"

export function VerificationForm({
  initialCode = "",
}: {
  initialCode?: string
}) {
  const cancelled = useRef(false)
  const [progress, setProgress] = useState(0)
  const [hash, setHash] = useState("")

  async function hashFile(file: File) {
    cancelled.current = false
    setProgress(10)
    const bytes = await file.arrayBuffer()
    if (cancelled.current) return
    setProgress(60)
    const digest = await crypto.subtle.digest("SHA-256", bytes)
    if (cancelled.current) return
    const value = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
    setHash(value)
    setProgress(100)
  }

  return (
    <form className="verify-form" method="get">
      <label>
        Verification code
        <input
          name="code"
          defaultValue={initialCode}
          required
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <label>
        Optional local file
        <input
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void hashFile(file)
          }}
        />
      </label>
      <input type="hidden" name="hash" value={hash} />
      <div className="progress-row" aria-live="polite">
        <progress max="100" value={progress} aria-label="Hashing progress" />
        <span>
          {progress ? `${progress}% hashed locally` : "No file uploaded"}
        </span>
        {progress > 0 && progress < 100 ? (
          <button
            type="button"
            className="quiet"
            onClick={() => {
              cancelled.current = true
              setProgress(0)
              setHash("")
            }}
          >
            Cancel
          </button>
        ) : null}
      </div>
      <p className="privacy-note">
        Your file stays in this browser. Only its SHA-256 hash is submitted.
      </p>
      <button type="submit">Verify evidence</button>
    </form>
  )
}
