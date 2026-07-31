"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronsUpDownIcon, LayoutGridIcon, SearchIcon } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/dtg/popover"
import type { ShellProjectOption } from "@/server/services/shell/shell-overview"

type ProjectSwitcherProps = {
  projects: ShellProjectOption[]
  projectCount: number
}

// Design §4: brand · project switcher · search. The switcher is a 430px panel
// with an in-place filter, one row per project (mono code, name, role) and a
// footer link to the full register.
export function ProjectSwitcher({
  projects,
  projectCount,
}: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return projects
    return projects.filter(
      (project) =>
        project.code.toLowerCase().includes(term) ||
        project.name.toLowerCase().includes(term) ||
        project.clientName.toLowerCase().includes(term)
    )
  }, [projects, query])

  const current = projects[0]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Switch project"
          className="border-edge bg-raise flex shrink-0 items-center gap-2 rounded-[7px] border px-2.5 py-[5px] whitespace-nowrap"
          data-b
        >
          <span className="text-accent font-mono text-[10.5px]">
            {current ? current.code : "ALL"}
          </span>
          <span className="max-w-[230px] truncate text-[11.5px]">
            {current ? current.name : "Project portfolio"}
          </span>
          <ChevronsUpDownIcon className="text-dim size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[430px] rounded-[10px] p-2"
      >
        <label className="border-line text-dim mb-1.5 flex items-center gap-[7px] rounded-[7px] border px-2 py-1.5">
          <SearchIcon className="size-3" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${projectCount} projects…`}
            className="text-text placeholder:text-dim w-full bg-transparent text-[11.5px] outline-none"
          />
        </label>
        <div className="max-h-[300px] overflow-auto">
          {filtered.length > 0 ? (
            filtered.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-[9px] rounded-[7px] px-2 py-[7px]"
                data-h
              >
                <span className="text-accent-txt min-w-[52px] shrink-0 font-mono text-[10.5px] whitespace-nowrap">
                  {project.code}
                </span>
                <span className="flex-1 truncate text-[11.5px]">
                  {project.name}
                </span>
                <span className="text-dim shrink-0 text-[10.5px]">
                  {project.clientName}
                </span>
              </Link>
            ))
          ) : (
            <p className="text-dim px-2 py-6 text-center text-[11.5px]">
              No project matches that search.
            </p>
          )}
        </div>
        <Link
          href="/projects"
          onClick={() => setOpen(false)}
          className="border-line text-accent-txt mt-1.5 flex items-center gap-2 border-t px-2 py-[7px] text-[11.5px]"
          data-h
        >
          <LayoutGridIcon className="size-3.5" />
          See all {projectCount} projects
        </Link>
      </PopoverContent>
    </Popover>
  )
}
