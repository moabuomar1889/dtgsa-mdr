import Link from "next/link"
import {
  CheckCircle2Icon,
  CircleDotDashedIcon,
  ClipboardCheckIcon,
  MessageSquareTextIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "lucide-react"
import {
  WORK_REGISTER_CATEGORIES,
  WORK_REGISTER_DEPLOYMENT_STATUSES,
  WORK_REGISTER_PRIORITIES,
  WORK_REGISTER_STATUSES,
  isWorkRegisterCategory,
  isWorkRegisterStatus,
} from "@/lib/forms/work-register"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { requireUserHasAnyPermission } from "@/server/services/auth/page-access-service"
import { getWorkRegisterOverview } from "@/server/services/work-register/work-register-service"
import {
  addWorkRegisterCommentAction,
  createWorkRegisterItemAction,
  updateWorkRegisterItemAction,
} from "@/server/actions/work-register"
import { WorkRegisterComposer } from "@/components/app/work-register-composer"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/dtg/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dtg/card"
import { Input } from "@/components/dtg/input"
import { Label } from "@/components/dtg/label"
import { Textarea } from "@/components/dtg/textarea"

export const dynamic = "force-dynamic"

type WorkRegisterPageProps = {
  searchParams?: Promise<{
    status?: string
    category?: string
    q?: string
    created?: string
    error?: string
    page?: string
  }>
}

const statusLabels = {
  Reported: "Reported",
  Investigating: "Investigating",
  Planned: "Planned",
  InProgress: "In progress",
  Blocked: "Blocked",
  Fixed: "Fixed",
  Verified: "Verified",
  Closed: "Closed",
} as const

const categoryLabels = {
  Bug: "Bug",
  Workflow: "Workflow",
  UserExperience: "UX",
  Performance: "Performance",
  Data: "Data",
  Security: "Security",
  Feature: "Feature",
  Other: "Other",
} as const

const deploymentLabels = {
  NotDeployed: "Not deployed",
  Staging: "Staging",
  Production: "Production",
} as const

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

function statusClass(status: keyof typeof statusLabels) {
  if (status === "Verified" || status === "Closed") {
    return "border-ok/40 bg-ok/10 text-ok"
  }
  if (status === "Blocked") {
    return "border-bad/40 bg-bad/10 text-bad"
  }
  if (status === "Fixed") {
    return "border-warn/40 bg-warn/10 text-warn"
  }
  if (status === "Investigating" || status === "InProgress") {
    return "border-accent-line bg-accent-bg text-accent-txt"
  }
  return "border-edge bg-raise text-muted"
}

function priorityClass(priority: string) {
  if (priority === "Critical") return "text-bad border-bad/40"
  if (priority === "High") return "text-warn border-warn/40"
  return "text-soft border-edge"
}

function itemCode(sequence: number) {
  return `MDR-${String(sequence).padStart(4, "0")}`
}

function paginationHref(
  query: Awaited<WorkRegisterPageProps["searchParams"]>,
  page: number
) {
  const parameters = new URLSearchParams()
  if (query?.status) parameters.set("status", query.status)
  if (query?.category) parameters.set("category", query.category)
  if (query?.q) parameters.set("q", query.q)
  parameters.set("page", String(page))
  return `/work-register?${parameters.toString()}`
}

export default async function WorkRegisterPage({
  searchParams,
}: WorkRegisterPageProps) {
  const user = await requireCurrentAppUser()
  requireUserHasAnyPermission(user, PERMISSIONS.dashboardView)
  const query = (await searchParams) ?? {}
  const overview = await getWorkRegisterOverview(user, {
    status: isWorkRegisterStatus(query.status) ? query.status : undefined,
    category: isWorkRegisterCategory(query.category)
      ? query.category
      : undefined,
    query: query.q,
    page: Number(query.page ?? "1"),
  })
  const allCount = WORK_REGISTER_STATUSES.reduce(
    (sum, status) => sum + (overview.statusCounts[status] ?? 0),
    0
  )
  const openCount = WORK_REGISTER_STATUSES.filter(
    (status) => !["Fixed", "Verified", "Closed"].includes(status)
  ).reduce((sum, status) => sum + (overview.statusCounts[status] ?? 0), 0)
  const verifiedCount =
    (overview.statusCounts.Verified ?? 0) + (overview.statusCounts.Closed ?? 0)

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <Card className="border-line bg-panel overflow-hidden">
        <CardHeader className="border-line bg-head relative gap-3 overflow-hidden border-b">
          <div className="bg-accent-bg pointer-events-none absolute -top-24 -right-20 size-64 rounded-full blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-2">
            <Badge className="bg-accent-bg text-accent-txt hover:bg-accent-bg rounded-[4px] px-1.5 py-0.5">
              Product work register
            </Badge>
            <Badge variant="outline">One comment, one traceable promise</Badge>
          </div>
          <CardTitle className="relative max-w-4xl text-[24px] font-medium tracking-[-0.025em]">
            Say what is wrong. We will show what happens next.
          </CardTitle>
          <CardDescription className="relative max-w-3xl leading-6">
            Report a broken page, confusing workflow, slow interaction, missing
            feature, or data problem. Every comment receives an ID, status,
            discussion history, and implementation evidence.
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-line grid gap-px p-0 sm:grid-cols-4">
          {[
            { label: "All promises", value: allCount },
            { label: "Open work", value: openCount },
            {
              label: "Fixed, awaiting proof",
              value: overview.statusCounts.Fixed ?? 0,
            },
            { label: "Verified or closed", value: verifiedCount },
          ].map((metric) => (
            <div key={metric.label} className="bg-panel px-4 py-3.5">
              <p className="text-dim text-[10.5px] tracking-[0.08em] uppercase">
                {metric.label}
              </p>
              <p className="mt-1 font-mono text-[22px] font-semibold">
                {metric.value}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {query.created ? (
        <div className="border-ok/40 bg-ok/10 text-ok flex items-center gap-2 rounded-[9px] border px-3 py-2 text-[12px]">
          <CheckCircle2Icon className="size-4" />
          Comment recorded. It is now part of the visible work register.
        </div>
      ) : null}

      {query.error ? (
        <div
          className="border-bad/40 bg-bad/10 text-bad rounded-[9px] border px-3 py-2 text-[12px]"
          role="alert"
        >
          {query.error}
        </div>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(320px,0.76fr)_minmax(0,1.5fr)]">
        <div className="grid gap-4 xl:sticky xl:top-4">
          <Card className="border-line bg-panel">
            <CardHeader className="border-line border-b">
              <div className="flex items-center gap-2">
                <MessageSquareTextIcon className="text-accent size-4" />
                <CardTitle className="text-[17px]">
                  Start with a comment
                </CardTitle>
              </div>
              <CardDescription>
                No technical wording is required. Describe the interruption in
                your own words.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <WorkRegisterComposer action={createWorkRegisterItemAction} />
            </CardContent>
          </Card>

          <Card className="border-line bg-panel">
            <CardContent className="grid gap-3 pt-4">
              <div className="flex items-start gap-3">
                <ClipboardCheckIcon className="text-soft mt-0.5 size-4" />
                <div>
                  <p className="text-[12px] font-medium">Clear ownership</p>
                  <p className="text-dim mt-1 text-[10.5px] leading-4">
                    Related promises may share a work pack, but each item keeps
                    its own status and evidence.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheckIcon className="text-soft mt-0.5 size-4" />
                <div>
                  <p className="text-[12px] font-medium">
                    Proof before closure
                  </p>
                  <p className="text-dim mt-1 text-[10.5px] leading-4">
                    Fixed items require a fix summary, exact file and line,
                    tests, and a commit before verification.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid min-w-0 gap-4">
          <Card className="border-line bg-panel">
            <CardContent className="grid gap-3 pt-4">
              <form method="get" className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <SearchIcon className="text-dim pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                  <Input
                    name="q"
                    defaultValue={query.q}
                    placeholder="Search title, description, area, or work pack"
                    className="pl-8"
                  />
                </div>
                {query.status ? (
                  <input type="hidden" name="status" value={query.status} />
                ) : null}
                <select
                  name="category"
                  defaultValue={query.category ?? ""}
                  aria-label="Filter by category"
                  className="border-edge bg-raise text-text h-8 rounded-[8px] border px-2.5 text-[11px]"
                >
                  <option value="">All types</option>
                  {WORK_REGISTER_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="border-edge bg-raise hover:border-accent h-8 rounded-[8px] border px-3 text-[11px] font-medium"
                >
                  Search
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5">
                <Link
                  href="/work-register"
                  className={`rounded-[6px] border px-2 py-1 text-[10.5px] ${!query.status ? "border-accent-line bg-accent-bg text-accent-txt" : "border-edge text-soft"}`}
                >
                  All
                </Link>
                {WORK_REGISTER_STATUSES.map((status) => (
                  <Link
                    key={status}
                    href={`/work-register?status=${status}`}
                    className={`rounded-[6px] border px-2 py-1 text-[10.5px] ${query.status === status ? statusClass(status) : "border-edge text-soft"}`}
                  >
                    {statusLabels[status]} {overview.statusCounts[status] ?? 0}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-soft text-[11px]">
              Showing <span className="font-mono">{overview.items.length}</span>{" "}
              of <span className="font-mono">{overview.total}</span> matching
              items
            </p>
            {query.status || query.category || query.q ? (
              <Link
                href="/work-register"
                className="text-accent-txt text-[11px] hover:underline"
              >
                Clear filters
              </Link>
            ) : null}
          </div>

          {overview.items.length === 0 ? (
            <Card className="border-line bg-panel border-dashed">
              <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
                <CircleDotDashedIcon className="text-dim size-7" />
                <div>
                  <p className="font-medium">No matching comments yet</p>
                  <p className="text-soft mt-1 text-[11px]">
                    Add the first comment or clear the current filters.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            overview.items.map((item) => (
              <article
                id={`item-${item.id}`}
                key={item.id}
                className="border-line bg-panel scroll-mt-4 overflow-hidden rounded-[10px] border"
              >
                <header className="border-line bg-head grid gap-3 border-b px-4 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-accent-txt font-mono text-[11px] font-semibold tracking-[0.04em]">
                        {itemCode(item.sequence)}
                      </span>
                      <Badge
                        variant="outline"
                        className={statusClass(item.status)}
                      >
                        {statusLabels[item.status]}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={priorityClass(item.priority)}
                      >
                        {item.priority}
                      </Badge>
                      <Badge variant="outline">
                        {categoryLabels[item.category]}
                      </Badge>
                    </div>
                    <span className="text-dim text-[10.5px]">
                      Updated {formatDate(item.updatedAt)}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-[17px] font-medium tracking-[-0.01em]">
                      {item.title}
                    </h2>
                    <p className="text-soft mt-2 text-[12px] leading-5 whitespace-pre-wrap">
                      {item.description}
                    </p>
                  </div>
                  <div className="text-dim flex flex-wrap gap-x-4 gap-y-1 text-[10.5px]">
                    <span>Reported by {item.reporter.fullName}</span>
                    {item.area ? <span>Area: {item.area}</span> : null}
                    {item.assignee ? (
                      <span>Owner: {item.assignee.fullName}</span>
                    ) : (
                      <span>Owner: Triage queue</span>
                    )}
                    {item.workPack ? <span>Pack: {item.workPack}</span> : null}
                  </div>
                </header>

                {(item.rootCause ||
                  item.fixSummary ||
                  item.fileReferences.length > 0 ||
                  item.testEvidence.length > 0 ||
                  item.commitSha) && (
                  <section className="border-line bg-line grid gap-px border-b md:grid-cols-2">
                    {item.rootCause ? (
                      <div className="bg-panel p-4">
                        <p className="text-dim text-[9.5px] font-medium tracking-[0.08em] uppercase">
                          Root cause
                        </p>
                        <p className="text-muted mt-2 text-[11.5px] leading-5 whitespace-pre-wrap">
                          {item.rootCause}
                        </p>
                      </div>
                    ) : null}
                    {item.fixSummary ? (
                      <div className="bg-panel p-4">
                        <p className="text-dim text-[9.5px] font-medium tracking-[0.08em] uppercase">
                          Fix
                        </p>
                        <p className="text-muted mt-2 text-[11.5px] leading-5 whitespace-pre-wrap">
                          {item.fixSummary}
                        </p>
                      </div>
                    ) : null}
                    {item.fileReferences.length > 0 ? (
                      <div className="bg-panel p-4">
                        <p className="text-dim text-[9.5px] font-medium tracking-[0.08em] uppercase">
                          Where
                        </p>
                        <div className="mt-2 grid gap-1">
                          {item.fileReferences.map((reference) => (
                            <code
                              key={reference}
                              className="text-accent-txt text-[10.5px] break-all"
                            >
                              {reference}
                            </code>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {item.testEvidence.length > 0 ? (
                      <div className="bg-panel p-4">
                        <p className="text-dim text-[9.5px] font-medium tracking-[0.08em] uppercase">
                          Proof
                        </p>
                        <ul className="text-muted mt-2 grid gap-1 text-[10.5px] leading-4">
                          {item.testEvidence.map((evidence) => (
                            <li key={evidence}>{evidence}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="bg-panel p-4 md:col-span-2">
                      <div className="flex flex-wrap items-center gap-3 text-[10.5px]">
                        <Badge variant="outline">
                          {deploymentLabels[item.deploymentStatus]}
                        </Badge>
                        {item.commitSha ? (
                          <code className="text-soft">
                            Commit {item.commitSha}
                          </code>
                        ) : null}
                        {item.remainingRisks ? (
                          <span className="text-warn">
                            Remaining risk: {item.remainingRisks}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </section>
                )}

                <section className="grid gap-3 p-4">
                  <details className="group">
                    <summary className="text-soft hover:text-text cursor-pointer list-none text-[11px] font-medium">
                      Discussion and history ({item.activities.length})
                    </summary>
                    <div className="border-line mt-3 grid gap-0 border-l pl-3">
                      {item.activities.map((activity) => (
                        <div key={activity.id} className="pb-3 last:pb-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-medium">
                              {activity.actor.fullName}
                            </span>
                            <Badge variant="outline" className="text-[9px]">
                              {activity.kind}
                            </Badge>
                            <span className="text-dim text-[9.5px]">
                              {formatDate(activity.createdAt)}
                            </span>
                          </div>
                          <p className="text-soft mt-1 text-[11px] leading-4 whitespace-pre-wrap">
                            {activity.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  </details>

                  <form
                    action={addWorkRegisterCommentAction}
                    className="flex flex-col gap-2 sm:flex-row"
                  >
                    <input type="hidden" name="itemId" value={item.id} />
                    <Input
                      name="body"
                      placeholder="Add a question, example, or clarification"
                      minLength={2}
                      maxLength={3000}
                      required
                      className="flex-1"
                    />
                    <SubmitButton
                      label="Comment"
                      pendingLabel="Posting"
                      variant="outline"
                    />
                  </form>

                  {overview.canManage ? (
                    <details className="border-line bg-raise rounded-[8px] border">
                      <summary className="text-muted cursor-pointer list-none px-3 py-2.5 text-[11px] font-medium">
                        Triage and implementation evidence
                      </summary>
                      <form
                        action={updateWorkRegisterItemAction}
                        className="border-line grid gap-4 border-t p-3"
                      >
                        <input type="hidden" name="itemId" value={item.id} />
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="grid gap-1.5">
                            <Label htmlFor={`${item.id}-status`}>Status</Label>
                            <select
                              id={`${item.id}-status`}
                              name="status"
                              defaultValue={item.status}
                              className="border-edge bg-panel h-8 rounded-[8px] border px-2 text-[11px]"
                            >
                              {WORK_REGISTER_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {statusLabels[status]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor={`${item.id}-priority`}>
                              Priority
                            </Label>
                            <select
                              id={`${item.id}-priority`}
                              name="priority"
                              defaultValue={item.priority}
                              className="border-edge bg-panel h-8 rounded-[8px] border px-2 text-[11px]"
                            >
                              {WORK_REGISTER_PRIORITIES.map((priority) => (
                                <option key={priority} value={priority}>
                                  {priority}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor={`${item.id}-category`}>
                              Category
                            </Label>
                            <select
                              id={`${item.id}-category`}
                              name="category"
                              defaultValue={item.category}
                              className="border-edge bg-panel h-8 rounded-[8px] border px-2 text-[11px]"
                            >
                              {WORK_REGISTER_CATEGORIES.map((category) => (
                                <option key={category} value={category}>
                                  {categoryLabels[category]}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor={`${item.id}-assignee`}>Owner</Label>
                            <select
                              id={`${item.id}-assignee`}
                              name="assigneeUserId"
                              defaultValue={item.assigneeUserId ?? ""}
                              className="border-edge bg-panel h-8 rounded-[8px] border px-2 text-[11px]"
                            >
                              <option value="">Triage queue</option>
                              {overview.assignees.map((assignee) => (
                                <option key={assignee.id} value={assignee.id}>
                                  {assignee.fullName}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="grid gap-1.5">
                            <Label htmlFor={`${item.id}-pack`}>Work pack</Label>
                            <Input
                              id={`${item.id}-pack`}
                              name="workPack"
                              defaultValue={item.workPack ?? ""}
                              placeholder="Example: Authentication and session flow"
                              maxLength={120}
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor={`${item.id}-deployment`}>
                              Deployment
                            </Label>
                            <select
                              id={`${item.id}-deployment`}
                              name="deploymentStatus"
                              defaultValue={item.deploymentStatus}
                              className="border-edge bg-panel h-8 rounded-[8px] border px-2 text-[11px]"
                            >
                              {WORK_REGISTER_DEPLOYMENT_STATUSES.map(
                                (status) => (
                                  <option key={status} value={status}>
                                    {deploymentLabels[status]}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor={`${item.id}-root-cause`}>
                              Root cause
                            </Label>
                            <Textarea
                              id={`${item.id}-root-cause`}
                              name="rootCause"
                              defaultValue={item.rootCause ?? ""}
                              className="min-h-24 resize-y"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor={`${item.id}-fix`}>
                              Fix summary
                            </Label>
                            <Textarea
                              id={`${item.id}-fix`}
                              name="fixSummary"
                              defaultValue={item.fixSummary ?? ""}
                              className="min-h-24 resize-y"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor={`${item.id}-files`}>
                              File and line references
                            </Label>
                            <Textarea
                              id={`${item.id}-files`}
                              name="fileReferences"
                              defaultValue={item.fileReferences.join("\n")}
                              placeholder="apps/mdr-web/src/app/page.tsx:42"
                              className="min-h-24 resize-y font-mono text-[10.5px]"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor={`${item.id}-tests`}>
                              Tests and verification
                            </Label>
                            <Textarea
                              id={`${item.id}-tests`}
                              name="testEvidence"
                              defaultValue={item.testEvidence.join("\n")}
                              placeholder="One command or verification result per line"
                              className="min-h-24 resize-y font-mono text-[10.5px]"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor={`${item.id}-commit`}>Commit</Label>
                            <Input
                              id={`${item.id}-commit`}
                              name="commitSha"
                              defaultValue={item.commitSha ?? ""}
                              placeholder="Commit SHA or reference"
                              maxLength={120}
                              className="font-mono"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor={`${item.id}-risks`}>
                              Remaining risks
                            </Label>
                            <Input
                              id={`${item.id}-risks`}
                              name="remainingRisks"
                              defaultValue={item.remainingRisks ?? ""}
                              placeholder="Known gap, blocker, or none"
                            />
                          </div>
                        </div>

                        <div className="grid gap-1.5">
                          <Label htmlFor={`${item.id}-update-note`}>
                            Update note
                          </Label>
                          <Input
                            id={`${item.id}-update-note`}
                            name="updateNote"
                            placeholder="Explain what changed in this update"
                            minLength={3}
                            maxLength={1000}
                            required
                          />
                        </div>
                        <div className="flex justify-end">
                          <SubmitButton
                            label="Save update"
                            pendingLabel="Saving evidence"
                          />
                        </div>
                      </form>
                    </details>
                  ) : null}
                </section>
              </article>
            ))
          )}

          {overview.pageCount > 1 ? (
            <nav
              aria-label="Work register pages"
              className="border-line bg-panel flex items-center justify-between rounded-[9px] border px-3 py-2.5"
            >
              <span className="text-dim font-mono text-[10.5px]">
                Page {overview.page} of {overview.pageCount}
              </span>
              <div className="flex gap-2">
                {overview.page > 1 ? (
                  <Link
                    href={paginationHref(query, overview.page - 1)}
                    className="border-edge bg-raise rounded-[7px] border px-2.5 py-1 text-[10.5px]"
                  >
                    Previous
                  </Link>
                ) : null}
                {overview.page < overview.pageCount ? (
                  <Link
                    href={paginationHref(query, overview.page + 1)}
                    className="border-edge bg-raise rounded-[7px] border px-2.5 py-1 text-[10.5px]"
                  >
                    Next
                  </Link>
                ) : null}
              </div>
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  )
}
