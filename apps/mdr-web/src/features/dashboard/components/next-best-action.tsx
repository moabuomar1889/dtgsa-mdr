import Link from "next/link"
import {
  ArrowRightIcon,
  Clock3Icon,
  FileCheck2Icon,
  FolderIcon,
  UserRoundIcon,
} from "lucide-react"
import type { CommandWorkspaceTask } from "@/features/dashboard/types"

export function NextBestAction({
  task,
  roleLabel,
}: {
  task: CommandWorkspaceTask | null
  roleLabel: string
}) {
  if (!task) {
    return (
      <section className="border-line bg-panel rounded-[10px] border p-5">
        <p className="text-dim font-mono text-[9px] tracking-[0.1em] uppercase">
          Your next best action
        </p>
        <h2 className="mt-3 text-[18px] font-medium">You are caught up</h2>
        <p className="text-soft mt-1 text-[11px]">
          New preparation, review, approval, and DC work will appear here.
        </p>
      </section>
    )
  }

  return (
    <section className="border-line bg-panel overflow-hidden rounded-[10px] border">
      <div className="p-4 md:p-5">
        <p className="text-dim font-mono text-[9px] tracking-[0.1em] uppercase">
          Your next best action
        </p>
        <div className="mt-3 flex items-start gap-3">
          <span className="border-accent-line bg-accent-bg text-accent-txt flex size-11 shrink-0 items-center justify-center rounded-[10px] border">
            <FileCheck2Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-accent-txt font-mono text-[9px] tracking-[0.08em] uppercase">
              {task.kind} document
            </span>
            <h2 className="mt-1 truncate text-[17px] font-medium tracking-[-0.02em]">
              {task.document.number} Rev {task.revisionLabel}
            </h2>
            <p className="text-soft mt-0.5 text-[11px]">
              {task.document.title}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="border-edge bg-raise text-soft flex items-center gap-1.5 rounded-[6px] border px-2 py-1 text-[9.5px]">
                <FolderIcon className="size-3" aria-hidden="true" />
                {task.project.code} {task.project.name}
              </span>
              <span className="border-edge bg-raise text-soft flex items-center gap-1.5 rounded-[6px] border px-2 py-1 text-[9.5px]">
                <UserRoundIcon className="size-3" aria-hidden="true" />
                {roleLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-line grid border-t md:grid-cols-[1.1fr_0.75fr_0.65fr_auto]">
        <div className="p-3.5 md:p-4">
          <p className="text-dim font-mono text-[8px] tracking-[0.1em] uppercase">
            Why it needs attention
          </p>
          <p className="text-soft mt-2 text-[10.5px] leading-5">
            {task.whyAttention}
          </p>
        </div>
        <div className="border-line border-t p-3.5 md:border-t-0 md:border-l md:p-4">
          <p className="text-dim font-mono text-[8px] tracking-[0.1em] uppercase">
            Readiness
          </p>
          <p className="mt-2 text-[10.5px] font-medium">
            {task.readiness.label}
          </p>
          <p className="text-dim mt-1 text-[9.5px]">{task.attentionLabel}</p>
        </div>
        <div className="border-line border-t p-3.5 md:border-t-0 md:border-l md:p-4">
          <p className="text-dim font-mono text-[8px] tracking-[0.1em] uppercase">
            Estimated effort
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[10.5px] font-medium">
            <Clock3Icon className="text-soft size-3.5" aria-hidden="true" />
            {task.estimatedEffort}
          </p>
          <p className="text-dim mt-1 text-[9.5px]">
            Updated {task.updatedLabel}
          </p>
        </div>
        <div className="border-line flex items-center border-t p-3.5 md:border-t-0 md:border-l md:p-4">
          <Link
            href={task.href}
            className="bg-accent text-on-accent flex w-full items-center justify-center gap-2 rounded-[7px] px-4 py-2.5 text-[11px] font-medium whitespace-nowrap"
          >
            Continue {task.kind.toLowerCase()}
            <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
