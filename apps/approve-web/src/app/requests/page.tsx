import Link from "next/link"
import type { SafeField } from "@dtg/integration-domain"
import { requireApprovalActor } from "../../server/auth"
import { prisma } from "../../server/database"
import { getGeneralRequestWorkspace } from "../../server/general-request-service"
import { submitGeneralRequestAction } from "./actions"

export const dynamic = "force-dynamic"

export default async function GeneralRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>
}) {
  await requireApprovalActor()
  const query = await searchParams
  const workspace = await getGeneralRequestWorkspace(prisma, {
    search: query.q,
    status: query.status,
  })
  const selected =
    workspace.types.find((type) => type.code === query.type) ??
    workspace.types[0]
  const fields = (selected?.version?.formDefinition ?? []) as SafeField[]

  return (
    <main className="app-shell">
      <header className="masthead">
        <div className="brand">
          DTG Signature Platform
          <small>General requests and administrative approvals</small>
        </div>
        <Link className="button secondary" href="/">
          Approval inbox
        </Link>
      </header>
      <div className="request-workspace">
        <section className="panel">
          <div className="panel-header">
            <span className="eyebrow">Configurable request intake</span>
            <h1>Start a controlled request</h1>
            <nav className="request-type-grid" aria-label="Request types">
              {workspace.types.map((type) => (
                <Link
                  key={type.id}
                  href={`/requests?type=${type.code}`}
                  data-selected={type.id === selected?.id}
                >
                  <strong>{type.name}</strong>
                  <small>{type.departmentOwner}</small>
                </Link>
              ))}
            </nav>
          </div>
          {selected?.version ? (
            <form
              action={submitGeneralRequestAction}
              className="panel-body form-grid"
            >
              <input
                type="hidden"
                name="requestTypeVersionId"
                value={selected.version.id}
              />
              <div className="field-pair">
                <label>
                  Purpose
                  <input name="purpose" required maxLength={500} />
                </label>
                <label>
                  Classification
                  <select name="classification">
                    <option value="INTERNAL">Internal</option>
                    <option value="CONFIDENTIAL">Confidential</option>
                    <option value="RESTRICTED">Restricted</option>
                  </select>
                </label>
              </div>
              <div className="field-pair">
                <label>
                  Source system
                  <input
                    name="sourceSystem"
                    defaultValue="APPROVE_WEB"
                    required
                  />
                </label>
                <label>
                  Source record ID
                  <input name="sourceRecordId" />
                </label>
              </div>
              {fields.map((field) => (
                <label key={field.key}>
                  {field.label}
                  {field.type === "select" ? (
                    <select
                      name={`field:${field.key}`}
                      required={field.required}
                    >
                      <option value="">Select</option>
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      name={`field:${field.key}`}
                      required={field.required}
                      maxLength={field.maxLength}
                    />
                  ) : field.type === "boolean" ? (
                    <select
                      name={`field:${field.key}`}
                      required={field.required}
                    >
                      <option value="">Select</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : (
                    <input
                      name={`field:${field.key}`}
                      required={field.required}
                      type={field.type}
                      maxLength={field.maxLength}
                    />
                  )}
                </label>
              ))}
              <label>
                Controlled attachment file IDs
                <input
                  name="attachmentFileObjectIds"
                  placeholder="Comma-separated immutable FileObject IDs"
                />
              </label>
              <button type="submit">Submit for controlled approval</button>
            </form>
          ) : (
            <div className="empty">No published request type is available.</div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <span className="eyebrow">Search and history</span>
            <h2>Request register</h2>
            <form className="filter-row">
              <input
                name="q"
                defaultValue={query.q}
                placeholder="Number, source, purpose"
              />
              <select name="status" defaultValue={query.status}>
                <option value="">All states</option>
                <option value="Submitted">Submitted</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Returned">Returned</option>
                <option value="Rejected">Rejected</option>
              </select>
              <button type="submit">Search</button>
            </form>
          </div>
          <div className="request-register">
            {workspace.requests.map((request) => (
              <article key={request.id}>
                <div>
                  <strong>{request.requestNumber}</strong>
                  <p>{request.purpose}</p>
                </div>
                <div>
                  <span className="status-pill">{request.status}</span>
                  <small className="mono">{request.sourceSystem}</small>
                </div>
              </article>
            ))}
            {workspace.requests.length === 0 && (
              <div className="empty">No requests match this view.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
