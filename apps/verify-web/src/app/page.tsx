import { headers } from "next/headers"
import { VerificationForm } from "./verification-form"
import { verifyPublicCode } from "../lib/verify"

export const dynamic = "force-dynamic"

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; hash?: string }>
}) {
  const query = await searchParams
  const requestHeaders = await headers()
  const result = query.code
    ? await verifyPublicCode({
        code: query.code,
        observedHash: query.hash || undefined,
        requestFingerprint:
          requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          requestHeaders.get("user-agent") ??
          "unknown",
      })
    : null

  return (
    <main>
      <header className="masthead">
        <div className="mark">DTG</div>
        <div>
          <p className="eyebrow">Signature Platform</p>
          <h1>Document verification, without surrendering your document.</h1>
        </div>
      </header>
      <section className="verification-grid">
        <div className="form-panel">
          <p className="kicker">Public evidence check</p>
          <h2>Verify a package, file, seal, or generated download.</h2>
          <VerificationForm initialCode={query.code} />
        </div>
        <div className="result-panel" aria-live="polite">
          {result ? (
            <>
              <p
                className={`status status-${String(result.status).toLowerCase()}`}
              >
                {String(result.status).replaceAll("_", " ")}
              </p>
              <h2>{String(result.reason)}</h2>
              <dl>
                {Object.entries(result)
                  .filter(
                    ([key]) => !["status", "reason", "seal"].includes(key)
                  )
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt>{key.replaceAll(/([A-Z])/g, " $1")}</dt>
                      <dd>
                        {value === null ? "Not disclosed" : String(value)}
                      </dd>
                    </div>
                  ))}
              </dl>
              <p className="seal-note">
                Platform application seal only. This portal does not claim
                PAdES.
              </p>
            </>
          ) : (
            <>
              <p className="kicker">Privacy by default</p>
              <h2>No record is loaded until you submit a code.</h2>
              <p>
                Public results are controlled by a versioned project policy.
                Emails, comments, storage IDs, sessions, IP data, and private
                employee details are never returned.
              </p>
            </>
          )}
        </div>
      </section>
      <footer>
        <span>Authoritative Main</span>
        <span>Client evidence</span>
        <span>Generated artifact</span>
      </footer>
    </main>
  )
}
