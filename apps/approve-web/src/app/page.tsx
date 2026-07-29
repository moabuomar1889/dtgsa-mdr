import Link from "next/link"
import {
  completeReviewAction,
  createCommentAction,
  openReviewAction,
  submitDecisionAction,
} from "./actions"
import { ReviewViewer } from "./review-viewer"
import { getApprovalInbox, getReviewCase } from "../server/approval-dal"

export const dynamic = "force-dynamic"

const states = [
  "ACTIVE",
  "UPCOMING",
  "RETURNED",
  "CLARIFICATION",
  "COMPLETED",
  "DELEGATED",
  "OVERDUE",
] as const

export default async function ApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; q?: string; step?: string }>
}) {
  const query = await searchParams
  const state = states.includes(query.state as (typeof states)[number])
    ? (query.state as (typeof states)[number])
    : undefined
  const inbox = await getApprovalInbox({ state, search: query.q })
  const selectedId = query.step ?? inbox.items[0]?.id
  const reviewCase = selectedId ? await getReviewCase(selectedId) : null
  const mdrOrigin =
    process.env.NEXT_PUBLIC_MDR_ORIGIN?.trim() || "http://127.0.0.1:3000"

  if (!inbox.actor) {
    return (
      <main className="app-shell">
        <header className="masthead">
          <div className="brand">
            DTG Signature Platform
            <small>Controlled internal approvals</small>
          </div>
        </header>
        <section className="empty">
          <h1>Internal authentication required</h1>
          <p>
            Sign in through the DTG Workspace identity flow, then return to this
            approval application.
          </p>
          <a className="button" href={`${mdrOrigin}/sign-in`}>
            Open secure sign in
          </a>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="masthead">
        <div className="brand">
          DTG Signature Platform
          <small>Exact-package review desk</small>
        </div>
        <div className="masthead-actions">
          <Link className="button secondary" href="/requests">
            General requests
          </Link>
          <div>
            <strong>{inbox.actor.fullName}</strong>
            <small className="eyebrow">{inbox.actor.email}</small>
          </div>
        </div>
      </header>
      <div className="workspace">
        <aside className="panel inbox-panel">
          <div className="panel-header">
            <span className="eyebrow">Approval inbox</span>
            <h1>My controlled steps</h1>
            <form className="filter-row">
              <input
                name="q"
                defaultValue={query.q}
                placeholder="Search document, project, role"
                aria-label="Search approval inbox"
              />
              <button type="submit">Search</button>
            </form>
            <nav className="filter-row" aria-label="Inbox states">
              {states.map((item) => (
                <Link key={item} href={`/?state=${item}`}>
                  {item.replace("_", " ")} {inbox.counts[item] ?? 0}
                </Link>
              ))}
            </nav>
          </div>
          <div className="inbox-list">
            {inbox.items.map((item) => (
              <Link
                key={item.id}
                href={`/?${state ? `state=${state}&` : ""}step=${item.id}`}
                className="inbox-item"
                data-selected={selectedId === item.id}
              >
                <strong>{item.documentNumber}</strong>
                <span>{item.title}</span>
                <small className="muted">
                  Rev {item.revision} - {item.project} - {item.client}
                </small>
                <small className="mono">
                  {item.stepLabel} - {item.requiredRole} - {item.progress}
                </small>
              </Link>
            ))}
            {inbox.items.length === 0 && (
              <div className="empty">
                No steps match this secure view. Adjust filters or retry.
              </div>
            )}
          </div>
        </aside>

        <div className="review-column">
          {reviewCase ? (
            <>
              <section className="panel case-header">
                <div className="panel-body">
                  <span className="eyebrow">
                    {reviewCase.step.label} - {reviewCase.step.status}
                  </span>
                  <h2>
                    {reviewCase.document.number} - {reviewCase.document.title}
                  </h2>
                  <p className="muted">
                    Revision {reviewCase.document.revision} -{" "}
                    {reviewCase.document.project} - {reviewCase.document.client}
                  </p>
                  <div className="hash">
                    Package Hash: {reviewCase.document.packageHash}
                  </div>
                </div>
                {!reviewCase.review ? (
                  <div className="panel-body">
                    <form
                      action={openReviewAction.bind(null, reviewCase.step.id)}
                    >
                      <button type="submit">
                        Open exact controlled package
                      </button>
                    </form>
                    <p className="muted">
                      Opening creates a user and Package Hash-bound review
                      session. The evidence records rendered pages and
                      approximate active time, never a claim that every page was
                      read.
                    </p>
                  </div>
                ) : reviewCase.document.fileObjectId ? (
                  <ReviewViewer
                    fileName={reviewCase.document.fileName}
                    reviewSessionId={reviewCase.review.id}
                    fileUrl={`/api/review/files/${reviewCase.document.fileObjectId}?reviewSession=${reviewCase.review.id}`}
                  />
                ) : (
                  <div className="empty">
                    The controlled PDF is unavailable. Retry after Document
                    Control completes integrity verification.
                  </div>
                )}
              </section>

              <section className="split">
                <div className="panel">
                  <div className="panel-header">
                    <span className="eyebrow">Truthful review evidence</span>
                    <h2>Session activity</h2>
                  </div>
                  <div className="panel-body">
                    {reviewCase.review ? (
                      <>
                        <p>
                          Rendered pages:{" "}
                          {reviewCase.review.renderedPages.join(", ") || "None"}
                        </p>
                        <p>
                          Approximate active time:{" "}
                          {reviewCase.review.activeSeconds} seconds
                        </p>
                        <p>
                          Review completed:{" "}
                          {reviewCase.review.completedAt ? "Yes" : "Not yet"}
                        </p>
                        {!reviewCase.review.completedAt && (
                          <form
                            action={completeReviewAction.bind(
                              null,
                              reviewCase.review.id
                            )}
                          >
                            <button type="submit">
                              Accept responsibility declaration
                            </button>
                          </form>
                        )}
                      </>
                    ) : (
                      <p>Open the package to begin.</p>
                    )}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <span className="eyebrow">Decision panel</span>
                    <h2>Record one atomic outcome</h2>
                  </div>
                  <form
                    action={submitDecisionAction}
                    className="panel-body form-grid"
                  >
                    <input
                      type="hidden"
                      name="stepInstanceId"
                      value={reviewCase.step.id}
                    />
                    <input
                      type="hidden"
                      name="reviewSessionId"
                      value={reviewCase.review?.id ?? ""}
                    />
                    <input
                      type="hidden"
                      name="idempotencyKey"
                      value={`ui-${reviewCase.step.id}-${reviewCase.step.stateVersion}`}
                    />
                    <select name="decision" aria-label="Approval decision">
                      <option value="APPROVE">Approve and Sign</option>
                      <option value="APPROVE_WITH_COMMENT">
                        Approve with Non-Blocking Comment
                      </option>
                      <option value="REQUEST_CLARIFICATION">
                        Request Clarification
                      </option>
                      <option value="RETURN">Return for Revision</option>
                      <option value="REJECT">Reject</option>
                      <option value="DC_VALIDATE">DC Validate</option>
                      <option value="DC_RETURN">DC Return</option>
                    </select>
                    <textarea
                      name="comments"
                      placeholder="Decision note or required return reason"
                    />
                    <input
                      name="responsibleDepartment"
                      placeholder="Responsible department for return"
                    />
                    <input
                      name="blockingCommentIds"
                      placeholder="Blocking comment IDs, comma separated"
                    />
                    <input name="dueAt" type="datetime-local" />
                    <label>
                      <input name="returnConfirmed" type="checkbox" /> Confirm
                      return scope when returning
                    </label>
                    <label>
                      <input name="declaration" type="checkbox" required /> I
                      reviewed this exact Package Hash and accept responsibility
                      for this decision.
                    </label>
                    <button
                      type="submit"
                      disabled={!reviewCase.review?.completedAt}
                    >
                      Record decision
                    </button>
                  </form>
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <span className="eyebrow">Comments and annotations</span>
                  <h2>Controlled review findings</h2>
                </div>
                <div className="split panel-body">
                  <form action={createCommentAction} className="form-grid">
                    <input
                      type="hidden"
                      name="revisionId"
                      value={reviewCase.document.revisionId}
                    />
                    <textarea
                      name="body"
                      required
                      placeholder="Review comment"
                    />
                    <select name="locationType">
                      <option value="GENERAL">General</option>
                      <option value="PAGE">Page</option>
                      <option value="AREA">Area rectangle</option>
                      <option value="TEXT">Text selection</option>
                    </select>
                    <input
                      name="pageNumber"
                      type="number"
                      min="1"
                      placeholder="Page"
                    />
                    <div className="action-row">
                      <input
                        name="x"
                        type="number"
                        step="0.001"
                        placeholder="x"
                      />
                      <input
                        name="y"
                        type="number"
                        step="0.001"
                        placeholder="y"
                      />
                      <input
                        name="width"
                        type="number"
                        step="0.001"
                        placeholder="width"
                      />
                      <input
                        name="height"
                        type="number"
                        step="0.001"
                        placeholder="height"
                      />
                    </div>
                    <input name="selectedText" placeholder="Selected text" />
                    <input name="category" placeholder="Category" />
                    <input name="dueAt" type="datetime-local" />
                    <label>
                      <input name="blocking" type="checkbox" /> Blocking
                    </label>
                    <button type="submit">Add comment</button>
                  </form>
                  <div>
                    {reviewCase.comments.map((comment) => (
                      <article
                        key={comment.id}
                        className={`comment ${comment.blocking ? "blocking" : ""}`}
                      >
                        <strong>
                          {comment.category ?? "General"} - {comment.state}
                        </strong>
                        <p>{comment.body}</p>
                        <small className="mono">{comment.id}</small>
                      </article>
                    ))}
                    {reviewCase.comments.length === 0 && (
                      <p className="muted">No comments on this revision.</p>
                    )}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <section className="panel empty">
              <h2>Select an assigned approval step</h2>
              <p>
                Active, upcoming, returned, delegated, overdue, and completed
                work stays project-scoped.
              </p>
            </section>
          )}
          <section className="panel">
            <div className="panel-body">
              <span className="eyebrow">Context help</span>
              <h2>Review before responsibility</h2>
              <p>
                Prepared By Manager, Reviewer, Approver, and DC Validator each
                review the exact controlled Package Hash. Signature appearance
                is visible context; immutable approval evidence is the trust
                record. Blocking comments require independent verification
                before approval.
              </p>
              <p className="muted">
                If connectivity is lost, do not decide from a stale page. Retry
                the controlled viewer and confirm the Package Hash remains
                unchanged.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
