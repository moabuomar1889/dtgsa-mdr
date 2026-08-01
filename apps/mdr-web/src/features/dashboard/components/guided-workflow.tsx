"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRightIcon, ChevronDownIcon } from "lucide-react"
import type { CommandWorkspaceTask } from "@/features/dashboard/types"

const steps = [
  {
    label: "Prepare document",
    description: "Confirm the source file, metadata, and preparation notes.",
  },
  {
    label: "Discipline review",
    description: "Review the technical content and record review comments.",
  },
  {
    label: "Formal approval",
    description: "Approve the reviewed package or return it with a reason.",
  },
  {
    label: "Document Control check",
    description: "Validate numbering, files, signatures, and issue readiness.",
  },
  {
    label: "Issue and follow up",
    description:
      "Issue the controlled package and monitor the client response.",
  },
]

export function GuidedWorkflow({
  task,
}: {
  task: CommandWorkspaceTask | null
}) {
  const [openStep, setOpenStep] = useState(task?.workflowStepIndex ?? 0)

  if (!task) return null

  return (
    <section aria-labelledby="guided-workflow-title">
      <div className="mb-2.5 flex items-end justify-between gap-3">
        <div>
          <h2 id="guided-workflow-title" className="text-[14px] font-medium">
            Today&apos;s workflow for this document
          </h2>
          <p className="text-dim mt-0.5 text-[9.5px]">
            Follow the controlled sequence without leaving your workspace.
          </p>
        </div>
        <span className="text-dim hidden font-mono text-[9px] sm:inline">
          {steps.length} steps
        </span>
      </div>

      <div className="relative space-y-1.5 pl-6">
        <span className="bg-line absolute top-4 bottom-4 left-[9px] w-px" />
        {steps.map((step, index) => {
          const complete = index < task.workflowStepIndex
          const current = index === task.workflowStepIndex
          const open = openStep === index
          return (
            <div
              key={step.label}
              className={
                current
                  ? "border-accent-line bg-accent-bg2 relative rounded-[9px] border"
                  : "border-line bg-panel relative rounded-[9px] border"
              }
            >
              <span
                className={
                  complete || current
                    ? "bg-accent text-on-accent absolute top-3 -left-6 z-10 flex size-[18px] items-center justify-center rounded-full font-mono text-[8px]"
                    : "border-edge bg-bg text-dim absolute top-3 -left-6 z-10 flex size-[18px] items-center justify-center rounded-full border font-mono text-[8px]"
                }
              >
                {index + 1}
              </span>
              <button
                type="button"
                onClick={() => setOpenStep(open ? -1 : index)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-3 py-3 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-[10.5px] font-medium">
                    {step.label}
                    {current ? (
                      <span className="bg-accent-bg text-accent-txt rounded-[3px] px-1.5 py-0.5 font-mono text-[8px] tracking-[0.08em] uppercase">
                        In progress
                      </span>
                    ) : complete ? (
                      <span className="text-ok font-mono text-[8px] uppercase">
                        Complete
                      </span>
                    ) : null}
                  </span>
                  {!open ? (
                    <span className="text-dim mt-0.5 block truncate text-[9.5px]">
                      {step.description}
                    </span>
                  ) : null}
                </span>
                <ChevronDownIcon
                  className={`text-dim size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {open ? (
                <div className="border-line grid gap-3 border-t px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <p className="text-soft text-[10px] leading-5">
                      {step.description}
                    </p>
                    <p className="text-dim mt-1.5 font-mono text-[8.5px]">
                      {task.project.code} / {task.document.number} / Rev{" "}
                      {task.revisionLabel}
                    </p>
                  </div>
                  {current ? (
                    <Link
                      href={task.href}
                      className="border-accent-line bg-accent-bg text-accent-txt flex items-center justify-center gap-2 rounded-[7px] border px-3 py-2 text-[10px] font-medium"
                    >
                      {task.actionLabel}
                      <ArrowRightIcon className="size-3" aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
