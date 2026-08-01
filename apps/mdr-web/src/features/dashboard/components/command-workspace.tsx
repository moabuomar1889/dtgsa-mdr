"use client"

import { useState } from "react"
import { AttentionSummary } from "@/features/dashboard/components/attention-summary"
import { GuidedWorkflow } from "@/features/dashboard/components/guided-workflow"
import { NextBestAction } from "@/features/dashboard/components/next-best-action"
import { PriorityTaskList } from "@/features/dashboard/components/priority-task-list"
import { ProjectWorkflowHeader } from "@/features/dashboard/components/project-workflow-header"
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
    }
  }

  return (
    <div className="flex flex-1 flex-col px-3 py-3 md:px-5 md:py-4">
      <div className="grid min-h-0 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-3">
          <ProjectWorkflowHeader
            projects={overview.projects}
            selectedProject={overview.selectedProject}
            stages={overview.projectStages}
          />

          <AttentionSummary attention={overview.attention} />

          <NextBestAction
            task={overview.nextTask}
            roleLabel={overview.user.roleLabel}
          />

          <div className="grid items-start gap-3 lg:grid-cols-[1.05fr_0.95fr]">
            <GuidedWorkflow key={selectedTask?.id} task={selectedTask} />
            <PriorityTaskList
              tasks={overview.tasks}
              selectedTaskId={selectedTask?.id}
              onSelect={selectTask}
            />
          </div>
        </main>

        <aside className="border-line bg-panel sticky top-3 hidden h-[calc(100svh-82px)] min-h-[620px] overflow-hidden rounded-[10px] border xl:flex xl:flex-col">
          <TaskDetailPanel task={selectedTask} />
        </aside>
      </div>

      <Sheet open={mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
        <SheetContent className="w-full gap-0 sm:max-w-md" side="right">
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
