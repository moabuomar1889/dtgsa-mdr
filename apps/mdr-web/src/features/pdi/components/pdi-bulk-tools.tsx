import { FileDownIcon, FileUpIcon } from "lucide-react"
import type { importPdiWorkbookAction } from "@/server/actions/pdi-import"
import { SubmitButton } from "@/components/app/submit-button"
import { Button } from "@/components/dtg/button"
import { Input } from "@/components/dtg/input"

type ProjectOption = {
  id: string
  code: string
  name: string
}

export function PdiBulkTools({
  projects,
  importAction,
}: {
  projects: ProjectOption[]
  importAction: typeof importPdiWorkbookAction
}) {
  return (
    <div className="space-y-4">
      <section className="border-line bg-raise rounded-[9px] border p-4">
        <div className="flex items-start gap-3">
          <FileDownIcon
            className="text-accent-txt mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-[12px] font-medium">Export workbook</h2>
            <p className="text-soft mt-1 text-[10.5px] leading-5">
              Download one project register for client collaboration.
            </p>
          </div>
        </div>
        <form
          action="/api/pdi/export"
          method="get"
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"
        >
          <select
            name="projectId"
            aria-label="Project to export"
            className="border-edge bg-bg h-9 min-w-0 rounded-[7px] border px-3 text-[11px]"
            defaultValue={projects[0]?.id}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline">
            Export workbook
          </Button>
        </form>
      </section>

      <section className="border-line bg-raise rounded-[9px] border p-4">
        <div className="flex items-start gap-3">
          <FileUpIcon
            className="text-accent-txt mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-[12px] font-medium">Import workbook</h2>
            <p className="text-soft mt-1 text-[10.5px] leading-5">
              Reconcile client numbering updates into one project.
            </p>
          </div>
        </div>
        <form action={importAction} className="mt-4 grid gap-3">
          <select
            name="projectId"
            aria-label="Import target project"
            className="border-edge bg-bg h-9 rounded-[7px] border px-3 text-[11px]"
            defaultValue={projects[0]?.id}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
          <Input
            name="file"
            type="file"
            aria-label="Excel workbook"
            accept=".xlsx,.xls"
            required
          />
          <SubmitButton label="Import workbook" pendingLabel="Importing" />
        </form>
      </section>
    </div>
  )
}
