"use client"

import Link from "next/link"
import { ArrowRightIcon, SlidersHorizontalIcon } from "lucide-react"
import type { CommandWorkspaceTask } from "@/features/dashboard/types"

const priorityTone = {
  High: "text-bad",
  Medium: "text-warn",
  Normal: "text-soft",
} as const

export function PriorityTaskList({
  tasks,
  selectedTaskId,
  onSelect,
}: {
  tasks: CommandWorkspaceTask[]
  selectedTaskId?: string
  onSelect: (taskId: string) => void
}) {
  return (
    <section
      id="priority-tasks"
      aria-labelledby="priority-tasks-title"
      className="border-line bg-panel overflow-hidden rounded-[10px] border"
    >
      <div className="border-line flex items-center justify-between border-b px-3.5 py-3">
        <div>
          <h2 id="priority-tasks-title" className="text-[14px] font-medium">
            Priority tasks
          </h2>
          <p className="text-dim mt-0.5 text-[9.5px]">
            Real actions available to your current roles.
          </p>
        </div>
        <SlidersHorizontalIcon
          className="text-dim size-3.5"
          aria-hidden="true"
        />
      </div>

      {tasks.length > 0 ? (
        <div className="divide-line divide-y">
          {tasks.slice(0, 8).map((task) => {
            const selected = task.id === selectedTaskId
            return (
              <div
                key={task.id}
                className={selected ? "bg-accent-bg2" : "hover:bg-raise"}
              >
                <div className="grid items-center gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_84px_70px_auto]">
                  <button
                    type="button"
                    onClick={() => onSelect(task.id)}
                    aria-pressed={selected}
                    className="min-w-0 text-left"
                  >
                    <span className="block truncate text-[10.5px] font-medium">
                      {task.document.number} / Rev {task.revisionLabel}
                    </span>
                    <span className="text-dim mt-0.5 block truncate text-[9.5px]">
                      {task.project.code} / {task.document.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelect(task.id)}
                    className="hidden text-left sm:block"
                  >
                    <span className="text-warn block text-[9.5px] font-medium">
                      {task.attentionLabel}
                    </span>
                    <span className="text-dim mt-0.5 block text-[8.5px]">
                      {task.updatedLabel}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelect(task.id)}
                    className={`hidden text-left text-[9.5px] font-medium sm:block ${priorityTone[task.priority]}`}
                  >
                    {task.priority}
                  </button>
                  <Link
                    href={task.href}
                    className="border-accent-line bg-accent-bg text-accent-txt flex items-center justify-center gap-1.5 rounded-[6px] border px-2.5 py-2 text-[9.5px] font-medium whitespace-nowrap"
                  >
                    {task.actionLabel}
                    <ArrowRightIcon className="size-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="px-5 py-10 text-center">
          <p className="text-[11px] font-medium">No actions are waiting</p>
          <p className="text-dim mt-1 text-[9.5px]">
            New role-based work will appear here automatically.
          </p>
        </div>
      )}

      {tasks.length > 8 ? (
        <Link
          href="/tasks"
          className="border-line text-accent-txt flex items-center gap-1.5 border-t px-3.5 py-2.5 text-[9.5px] font-medium"
        >
          View all {tasks.length} tasks
          <ArrowRightIcon className="size-3" aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  )
}
