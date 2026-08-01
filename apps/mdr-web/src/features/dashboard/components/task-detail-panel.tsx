import Link from "next/link"
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  FileCheck2Icon,
} from "lucide-react"
import type { CommandWorkspaceTask } from "@/features/dashboard/types"

const workflowSteps = ["Preparation", "Review", "Approval", "DC", "Notify"]

export function TaskDetailPanel({
  task,
}: {
  task: CommandWorkspaceTask | null
}) {
  if (!task) {
    return (
      <div className="flex min-h-72 items-center justify-center p-6 text-center">
        <div>
          <FileCheck2Icon
            className="text-dim mx-auto size-5"
            aria-hidden="true"
          />
          <p className="mt-3 text-[11px] font-medium">Select a task</p>
          <p className="text-dim mt-1 text-[9.5px]">
            Workflow context and the direct action will appear here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="border-line border-b p-4">
        <div className="flex items-center gap-2">
          <FileCheck2Icon
            className="text-accent-txt size-3.5"
            aria-hidden="true"
          />
          <span className="text-[10px] font-medium">{task.kind}</span>
          <span
            className={
              task.priority === "High"
                ? "border-bad/40 bg-bad/10 text-bad rounded-[4px] border px-1.5 py-0.5 text-[8.5px]"
                : "border-edge bg-raise text-soft rounded-[4px] border px-1.5 py-0.5 text-[8.5px]"
            }
          >
            {task.attentionLabel}
          </span>
        </div>
        <h2 className="mt-3 text-[16px] font-medium tracking-[-0.02em]">
          {task.document.number} Rev {task.revisionLabel}
        </h2>
        <p className="text-soft mt-1 text-[10.5px]">{task.document.title}</p>
        <p className="text-dim mt-2 text-[9.5px]">
          {task.project.code} - {task.project.name}
        </p>
      </div>

      <section className="border-line border-b p-4">
        <h3 className="text-[11px] font-medium">Workflow step</h3>
        <div className="mt-4 grid grid-cols-5">
          {workflowSteps.map((step, index) => {
            const complete = index < task.workflowStepIndex
            const current = index === task.workflowStepIndex
            return (
              <div key={step} className="relative text-center">
                {index > 0 ? (
                  <span className="bg-line absolute top-2.5 right-1/2 h-px w-full" />
                ) : null}
                <span
                  className={
                    complete || current
                      ? "bg-accent text-on-accent relative z-10 mx-auto flex size-5 items-center justify-center rounded-full"
                      : "border-edge bg-panel relative z-10 mx-auto flex size-5 items-center justify-center rounded-full border"
                  }
                >
                  {complete ? (
                    <CheckCircle2Icon className="size-3" aria-hidden="true" />
                  ) : (
                    <span className="size-1 rounded-full bg-current" />
                  )}
                </span>
                <span className="text-dim mt-2 block text-[7.5px]">{step}</span>
                {current ? (
                  <span className="text-accent-txt mt-0.5 block text-[7.5px]">
                    You are here
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <section className="border-line border-b p-4">
        <h3 className="text-[11px] font-medium">File readiness</h3>
        <div className="mt-3 flex items-start gap-2.5">
          <CheckCircle2Icon
            className={
              task.readiness.ready
                ? "text-ok mt-0.5 size-4 shrink-0"
                : "text-warn mt-0.5 size-4 shrink-0"
            }
            aria-hidden="true"
          />
          <div>
            <p className="text-[10px] font-medium">{task.readiness.label}</p>
            <p className="text-dim mt-0.5 text-[9px] leading-4">
              {task.readiness.detail}
            </p>
          </div>
        </div>
      </section>

      <section className="border-line border-b p-4">
        <h3 className="text-[11px] font-medium">History</h3>
        <div className="mt-3 space-y-3">
          {task.history.map((entry, index) => (
            <div
              key={`${entry.label}-${entry.occurredAt}`}
              className="relative pl-4"
            >
              {index < task.history.length - 1 ? (
                <span className="bg-line absolute top-3 bottom-[-14px] left-[3px] w-px" />
              ) : null}
              <span className="border-edge bg-panel absolute top-1 left-0 size-2 rounded-full border" />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[9.5px] font-medium">{entry.label}</p>
                  <p className="text-dim mt-0.5 text-[8.5px]">{entry.actor}</p>
                </div>
                <span className="text-dim shrink-0 text-[8px]">
                  {entry.occurredAt}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="p-4">
        <h3 className="text-[11px] font-medium">Context</h3>
        <dl className="mt-3 grid grid-cols-[1fr_1.15fr] gap-x-3 gap-y-2 text-[9px]">
          <dt className="text-dim">Discipline</dt>
          <dd>{task.document.disciplineName}</dd>
          <dt className="text-dim">Document type</dt>
          <dd>{task.document.typeName}</dd>
          <dt className="text-dim">Current revision</dt>
          <dd>{task.revisionLabel}</dd>
          <dt className="text-dim">Client</dt>
          <dd>{task.project.clientName}</dd>
          <dt className="text-dim">Workflow status</dt>
          <dd>{task.workflowStatus}</dd>
          <dt className="text-dim">Last updated</dt>
          <dd>{task.updatedLabel}</dd>
        </dl>
      </section>

      <div className="border-line bg-panel sticky bottom-0 mt-auto border-t p-4">
        <Link
          href={task.href}
          className="bg-accent text-on-accent flex w-full items-center justify-center gap-2 rounded-[7px] px-4 py-3 text-[11px] font-medium"
        >
          {task.actionLabel}
          <ArrowRightIcon className="size-3.5" aria-hidden="true" />
        </Link>
        <Link
          href={`/projects/${task.project.id}`}
          className="border-edge bg-raise text-soft mt-2 flex w-full items-center justify-center gap-2 rounded-[7px] border px-4 py-2.5 text-[10px] font-medium"
        >
          View in project
          <ExternalLinkIcon className="size-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
