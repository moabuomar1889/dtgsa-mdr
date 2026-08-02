"use client"

import { useState } from "react"
import { NextBestAction } from "@/features/dashboard/components/next-best-action"
import { PriorityTaskList } from "@/features/dashboard/components/priority-task-list"
import { ProjectHealthStrip } from "@/features/dashboard/components/project-health-strip"
import { TaskDetailPanel } from "@/features/dashboard/components/task-detail-panel"
import type { CommandWorkspaceOverview } from "@/features/dashboard/types"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/dtg/sheet"

export function CommandWorkspace({
  overview,
}: {
  overview: CommandWorkspaceOverview
}) {
  const [selectedTaskId, setSelectedTaskId] = useState(
    overview.nextTask?.id ?? overview.tasks[0]?.id
  )
  const [desktopDetailsOpen, setDesktopDetailsOpen] = useState(true)
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false)
  const selectedTask =
    overview.tasks.find((task) => task.id === selectedTaskId) ??
    overview.nextTask ??
    overview.tasks[0] ??
    null

  function selectTask(taskId: string) {
    setSelectedTaskId(taskId)
    if (window.matchMedia("(max-width: 1279px)").matches) {
      setMobileDetailsOpen(true)
    } else {
      setDesktopDetailsOpen(true)
    }
  }

  const firstName =
    overview.user.fullName.split(/\s+/).filter(Boolean)[0] ?? "there"

  return (
    <div className="flex flex-1 flex-col px-4 py-4 md:py-5 md:pr-0 md:pl-7">
      <div
        className={`grid min-h-0 items-start gap-4 ${
          desktopDetailsOpen
            ? "xl:grid-cols-[minmax(0,1fr)_304px]"
            : "xl:grid-cols-1"
        }`}
      >
        <main className="min-w-0 space-y-5">
          <header className="border-line flex items-end justify-between border-b pb-3">
            <div>
              <h1 className="text-[24px] font-semibold tracking-[-0.035em]">
                Good morning, {firstName}
              </h1>
              <p className="text-dim mt-1 text-[9.5px]">
                {overview.selectedProject
                  ? `Your action queue for ${overview.selectedProject.code}.`
                  : "Here’s your action queue across all projects."}
              </p>
            </div>
            <time className="text-dim hidden font-mono text-[8.5px] tracking-[0.08em] sm:block">
              {overview.todayLabel}
            </time>
          </header>

          <ProjectHealthStrip
            projects={overview.projects}
            selectedProjectId={overview.selectedProject?.id}
          />

          <NextBestAction task={overview.nextTask} />

          <PriorityTaskList
            tasks={overview.tasks}
            selectedTaskId={selectedTask?.id}
            onSelect={selectTask}
          />
        </main>

        {desktopDetailsOpen ? (
          <aside className="border-line bg-panel sticky top-4 hidden h-[calc(100svh-90px)] min-h-[620px] overflow-hidden rounded-[9px] border xl:flex xl:flex-col">
            <TaskDetailPanel
              task={selectedTask}
              onClose={() => setDesktopDetailsOpen(false)}
            />
          </aside>
        ) : null}
      </div>

      <Sheet open={mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
        <SheetContent className="w-full gap-0 p-0 sm:max-w-md" side="right">
          <SheetHeader className="sr-only">
            <SheetTitle>Task details</SheetTitle>
            <SheetDescription>
              Workflow context and direct task action.
            </SheetDescription>
          </SheetHeader>
          <TaskDetailPanel task={selectedTask} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
