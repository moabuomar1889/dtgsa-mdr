import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  CheckCircle2Icon,
  ClipboardCheckIcon,
  FileInputIcon,
  PenLineIcon,
  SendIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"
import type {
  CommandProjectOption,
  CommandProjectStage,
} from "@/features/dashboard/types"

const stageIcons: Record<string, LucideIcon> = {
  pdi: FileInputIcon,
  prepare: PenLineIcon,
  review: UsersIcon,
  approve: CheckCircle2Icon,
  dc: ShieldCheckIcon,
  issue: SendIcon,
  reply: ClipboardCheckIcon,
}

export function ProjectWorkflowHeader({
  projects,
  selectedProject,
  stages,
}: {
  projects: CommandProjectOption[]
  selectedProject: CommandProjectOption | null
  stages: CommandProjectStage[]
}) {
  if (!selectedProject) return null

  return (
    <section className="border-line bg-panel overflow-hidden rounded-[12px] border">
      <div className="border-line flex items-center gap-2 overflow-x-auto border-b px-3 py-2.5">
        <Link
          href="/dashboard"
          className="border-edge bg-raise text-soft hover:border-accent-line shrink-0 rounded-[7px] border px-3 py-2 text-[11px] font-medium"
        >
          All projects
        </Link>
        {projects.map((project) => {
          const active = project.id === selectedProject.id
          return (
            <Link
              key={project.id}
              href={`/dashboard?project=${encodeURIComponent(project.id)}`}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "border-accent-line bg-accent-bg text-text shrink-0 rounded-[7px] border px-3 py-2"
                  : "border-edge bg-raise text-soft hover:border-accent-line shrink-0 rounded-[7px] border px-3 py-2"
              }
            >
              <span className="flex items-center gap-2 text-[11px] font-medium">
                <span className="font-mono">{project.code}</span>
                {project.myTaskCount > 0 ? (
                  <span className="bg-accent-bg2 text-accent-txt rounded px-1.5 py-0.5 font-mono text-[9px]">
                    {project.myTaskCount}
                  </span>
                ) : null}
              </span>
              <span className="text-dim mt-0.5 block max-w-40 truncate text-[9.5px]">
                {project.name}
              </span>
            </Link>
          )
        })}
      </div>

      <div className="px-4 pt-4 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-accent-bg text-accent-txt rounded-[4px] px-1.5 py-0.5 font-mono text-[9px] tracking-[0.08em] uppercase">
                Project cockpit
              </span>
              <span className="text-dim font-mono text-[10px]">
                {selectedProject.code}
              </span>
            </div>
            <h1 className="mt-2 text-[22px] font-medium tracking-[-0.03em] md:text-[26px]">
              {selectedProject.code} - {selectedProject.name}
            </h1>
            <p className="text-soft mt-1 text-[11px]">
              {selectedProject.clientName}
            </p>
          </div>
          <Link
            href={`/projects/${selectedProject.id}`}
            className="border-edge bg-raise text-soft hover:border-accent-line rounded-[7px] border px-3 py-2 text-[11px] font-medium"
          >
            Project overview
          </Link>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto px-2 pb-2 md:px-3">
        <div className="grid min-w-[680px] grid-cols-7">
          {stages.map((stage, index) => {
            const Icon = stageIcons[stage.key] ?? ClipboardCheckIcon
            const active = stage.count > 0
            const content = (
              <>
                {index > 0 ? (
                  <span className="bg-line absolute top-6 -left-3 h-px w-6" />
                ) : null}
                <span className="text-soft group-hover:text-accent-txt flex items-center justify-center gap-1.5 text-[10.5px] font-medium">
                  <Icon className="size-3.5" aria-hidden="true" />
                  {stage.label}
                </span>
                <span className="mt-2 block font-mono text-[21px] font-semibold tracking-[-0.04em]">
                  {stage.count}
                </span>
                <span className="text-dim mt-0.5 block text-[9.5px]">
                  {stage.state}
                </span>
              </>
            )
            const className =
              active && stage.href
                ? "border-accent-line bg-accent-bg2 group relative border-b-2 px-2 py-3 text-center"
                : "border-line group relative border-b px-2 py-3 text-center"

            return stage.href ? (
              <Link key={stage.key} href={stage.href} className={className}>
                {content}
              </Link>
            ) : (
              <div
                key={stage.key}
                aria-disabled="true"
                className={className + " cursor-default opacity-55"}
              >
                {content}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
