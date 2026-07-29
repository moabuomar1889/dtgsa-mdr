"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type ProjectOption = {
  id: string
  code: string
  name: string
  client: {
    code: string
    name: string
  }
}

type EligibleRevisionOption = {
  id: string
  revisionLabel: string
  projectId: string
  title: string
  dtgsaDocumentNumber: string
  clientDocumentNumber: string | null
  attachmentFileName: string | null
  attachmentFileSizeBytes: number
}

type TransmittalCreateFormProps = {
  projects: ProjectOption[]
  eligibleRevisions: EligibleRevisionOption[]
  action: (formData: FormData) => void | Promise<void>
}

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return "0 B"
  }

  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const value = bytes / 1024 ** exponent

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

export function TransmittalCreateForm({
  projects,
  eligibleRevisions,
  action,
}: TransmittalCreateFormProps) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "")
  const [selectedRevisionIds, setSelectedRevisionIds] = useState<string[]>([])

  const filteredRevisions = useMemo(
    () =>
      eligibleRevisions.filter((revision) => revision.projectId === projectId),
    [eligibleRevisions, projectId]
  )

  const selectedBytes = useMemo(
    () =>
      filteredRevisions
        .filter((revision) => selectedRevisionIds.includes(revision.id))
        .reduce((sum, revision) => sum + revision.attachmentFileSizeBytes, 0),
    [filteredRevisions, selectedRevisionIds]
  )

  function toggleRevision(revisionId: string) {
    setSelectedRevisionIds((current) =>
      current.includes(revisionId)
        ? current.filter((item) => item !== revisionId)
        : [...current, revisionId]
    )
  }

  if (projects.length === 0) {
    return null
  }

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="transmittal-project">Project</Label>
        <Select
          value={projectId}
          onValueChange={(value) => {
            setProjectId(value)
            setSelectedRevisionIds((current) =>
              current.filter((revisionId) =>
                eligibleRevisions.some(
                  (revision) =>
                    revision.id === revisionId && revision.projectId === value
                )
              )
            )
          }}
        >
          <SelectTrigger id="transmittal-project" className="w-full">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Projects</SelectLabel>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <input type="hidden" name="projectId" value={projectId} />
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <Label>Ready-to-submit revisions</Label>
          <Badge variant="outline">
            {selectedRevisionIds.length} selected / {formatBytes(selectedBytes)}
          </Badge>
        </div>
        {selectedRevisionIds.map((revisionId) => (
          <input
            key={revisionId}
            type="hidden"
            name="revisionIds"
            value={revisionId}
          />
        ))}
        {filteredRevisions.length > 0 ? (
          <div className="grid max-h-80 gap-2 overflow-y-auto rounded-2xl border border-border/60 bg-background/60 p-2">
            {filteredRevisions.map((revision) => {
              const selected = selectedRevisionIds.includes(revision.id)

              return (
                <button
                  key={revision.id}
                  type="button"
                  onClick={() => toggleRevision(revision.id)}
                  className={cn(
                    "grid gap-2 rounded-xl border p-3 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/8"
                      : "border-border/70 bg-background hover:border-primary/40"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium">{revision.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {revision.dtgsaDocumentNumber} / Rev {revision.revisionLabel}
                      </p>
                    </div>
                    <Badge variant={selected ? "default" : "outline"}>
                      {selected ? "Selected" : "Available"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Client No: {revision.clientDocumentNumber ?? "Pending"}
                    </span>
                    <span>
                      File: {revision.attachmentFileName ?? "No uploaded file yet"}
                    </span>
                    <span>{formatBytes(revision.attachmentFileSizeBytes)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-4 text-sm text-muted-foreground">
            No current revisions in this project are ready for transmittal yet.
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="transmittal-subject">Subject</Label>
          <Input
            id="transmittal-subject"
            name="subject"
            placeholder="Document transmittal for client review"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="transmittal-purpose">Purpose</Label>
          <Input
            id="transmittal-purpose"
            name="purpose"
            placeholder="Issued for review"
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="transmittal-from">From</Label>
          <Input id="transmittal-from" name="fromText" placeholder="DTGSA DC" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="transmittal-to">To</Label>
          <Input id="transmittal-to" name="toText" placeholder="Client DC" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="transmittal-cc">CC</Label>
          <Input id="transmittal-cc" name="ccText" placeholder="cc recipients" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="transmittal-attention">Attention</Label>
          <Input
            id="transmittal-attention"
            name="attention"
            placeholder="Attention line"
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.35fr]">
        <div className="grid gap-2">
          <Label htmlFor="transmittal-body">Message</Label>
          <Textarea
            id="transmittal-body"
            name="messageBody"
            placeholder="Optional message for the outbound transmittal."
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="transmittal-respond-by">Respond by</Label>
          <Input id="transmittal-respond-by" name="respondByDate" type="date" />
        </div>
      </div>

      <SubmitButton
        label="Create transmittal draft"
        pendingLabel="Creating transmittal"
        disabled={selectedRevisionIds.length === 0}
      />
    </form>
  )
}
