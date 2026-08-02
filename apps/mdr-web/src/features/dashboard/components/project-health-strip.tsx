import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import type { CommandProjectOption } from "@/features/dashboard/types"

export function ProjectHealthStrip({
  projects,
  selectedProjectId,
}: {
  projects: CommandProjectOption[]
  selectedProjectId?: string
}) {
  if (projects.length === 0) return null

  return (
    <section aria-labelledby="project-health-title">
      <div className="mb-2.5 flex items-center justify-between">
        <h2
          id="project-health-title"
          className="text-dim font-mono text-[8.5px] tracking-[0.12em] uppercase"
        >
          Project health
        </h2>
        <Link
          href="/projects"
          className="text-dim hover:text-accent-txt flex items-center gap-1 text-[9.5px]"
        >
          View all projects
          <ArrowRightIcon className="size-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {projects.map((project) => {
          const active = project.id === selectedProjectId
          const needsAttention = project.myTaskCount > 0
          return (
            <Link
              key={project.id}
              href={active ? "/dashboard" : `/dashboard?project=${project.id}`}
              aria-current={active ? "page" : undefined}
              className={`min-w-[190px] flex-1 rounded-[7px] px-2 py-2 transition-colors ${
                active ? "bg-accent-bg" : "hover:bg-raise"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`size-2 rounded-full ${needsAttention ? "bg-warn" : "bg-ok"}`}
                />
                <span className="font-mono text-[10px] font-semibold tracking-[0.04em]">
                  {project.code}
                </span>
                <span
                  className={`ml-auto text-[8.5px] ${needsAttention ? "text-warn" : "text-dim"}`}
                >
                  {needsAttention ? "At risk" : "On track"}
                </span>
              </span>
              <span className="text-dim mt-1 block truncate text-[9px]">
                {project.name}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
