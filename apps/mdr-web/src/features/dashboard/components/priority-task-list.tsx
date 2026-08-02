"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRightIcon, SlidersHorizontalIcon } from "lucide-react"
import type {
  CommandTaskKind,
  CommandWorkspaceTask,
} from "@/features/dashboard/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dtg/dropdown-menu"

const priorityStyle = {
  High: "border-bad/40 bg-bad/10 text-bad",
  Medium: "border-warn/40 bg-warn/10 text-warn",
  Normal: "border-ok/35 bg-ok/10 text-ok",
} as const

type TaskFilter = "All" | CommandTaskKind

export function PriorityTaskList({
  tasks,
  selectedTaskId,
  onSelect,
}: {
  tasks: CommandWorkspaceTask[]
  selectedTaskId?: string
  onSelect: (taskId: string) => void
}) {
  const [filter, setFilter] = useState<TaskFilter>("All")
  const visibleTasks =
    filter === "All" ? tasks : tasks.filter((task) => task.kind === filter)
  const filterOptions: TaskFilter[] = [
    "All",
    ...Array.from(new Set(tasks.map((task) => task.kind))),
  ]

  return (
    <section id="priority-tasks" aria-labelledby="priority-tasks-title">
      <div className="mb-2.5 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="priority-tasks-title" className="text-[13px] font-semibold">
              Your action queue
            </h2>
            <span className="bg-accent-bg text-accent-txt rounded-[4px] px-1.5 py-0.5 font-mono text-[8.5px]">
              {visibleTasks.length}
            </span>
          </div>
          <p className="text-dim mt-0.5 text-[9px]">Sorted by urgency</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="text-dim hover:text-accent-txt flex items-center gap-1.5 rounded-[6px] px-2 py-1.5 text-[9.5px]"
            >
              <SlidersHorizontalIcon className="size-3" aria-hidden="true" />
              {filter === "All" ? "Filter" : filter}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuLabel>Workflow action</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={filter}
              onValueChange={(value) => setFilter(value as TaskFilter)}
            >
              {filterOptions.map((option) => (
                <DropdownMenuRadioItem key={option} value={option}>
                  {option}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="border-line overflow-hidden rounded-[8px] border">
        <div className="text-dim border-line bg-panel2 hidden grid-cols-[92px_1fr_1.45fr_1fr_92px_82px] gap-3 border-b px-3 py-2 font-mono text-[7.5px] tracking-[0.08em] uppercase lg:grid">
          <span>Priority</span>
          <span>Project</span>
          <span>Document & revision</span>
          <span>Action</span>
          <span>Attention</span>
          <span className="text-right">Open</span>
        </div>

        {visibleTasks.length > 0 ? (
          <div className="divide-line divide-y">
            {visibleTasks.map((task) => {
              const selected = task.id === selectedTaskId
              return (
                <div
                  key={task.id}
                  className={`relative grid items-center gap-3 px-3 py-3.5 transition-colors lg:grid-cols-[92px_1fr_1.45fr_1fr_92px_82px] ${
                    selected ? "bg-accent-bg2" : "hover:bg-raise"
                  }`}
                >
                  {selected ? (
                    <span className="bg-accent absolute inset-y-0 left-0 w-[2px]" />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onSelect(task.id)}
                    className="grid min-w-0 gap-3 text-left lg:col-span-5 lg:grid-cols-subgrid"
                    aria-pressed={selected}
                  >
                    <span>
                      <span
                        className={`inline-flex rounded-[5px] border px-2 py-1 text-[8.5px] font-medium ${priorityStyle[task.priority]}`}
                      >
                        {task.priority === "Normal" ? "Low" : task.priority}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[10px] font-semibold">
                        {task.project.code}
                      </span>
                      <span className="text-dim mt-0.5 block truncate text-[8.5px]">
                        {task.project.name}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[10px] font-medium">
                        {task.document.number} Rev {task.revisionLabel}
                      </span>
                      <span className="text-dim mt-0.5 block truncate text-[8.5px]">
                        {task.document.title}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-medium">
                        {task.actionLabel}
                      </span>
                      <span className="text-dim mt-0.5 block truncate text-[8.5px]">
                        {task.workflowStatus}
                      </span>
                    </span>
                    <span
                      className={
                        task.priority === "High" ? "text-bad" : "text-warn"
                      }
                    >
                      <span className="block text-[9px] font-medium">
                        {task.attentionLabel}
                      </span>
                      <span className="text-dim mt-0.5 block text-[8px]">
                        {task.updatedLabel}
                      </span>
                    </span>
                  </button>
                  <Link
                    href={task.href}
                    className={`flex items-center justify-center gap-1 rounded-[6px] border px-2 py-2 text-[8.5px] font-medium ${
                      selected
                        ? "border-accent bg-accent text-on-accent"
                        : "border-accent-line text-accent-txt"
                    }`}
                  >
                    {task.kind}
                    <ArrowRightIcon className="size-2.5" aria-hidden="true" />
                  </Link>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-[10px] font-medium">No matching actions</p>
            <p className="text-dim mt-1 text-[9px]">
              Choose another workflow filter or check back later.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
