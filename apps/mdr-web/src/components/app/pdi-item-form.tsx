"use client"

import { useState } from "react"
import { SubmitButton } from "@/components/app/submit-button"
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

type Option = {
  id: string
  code: string
  name: string
}

type ProjectOption = Option & {
  clientCode: string
  clientName: string
}

type PdiItemFormProps = {
  projects: ProjectOption[]
  disciplines: Option[]
  documentTypes: Option[]
  releasePurposes: Option[]
  action: (formData: FormData) => void | Promise<void>
}

export function PdiItemForm({
  projects,
  disciplines,
  documentTypes,
  releasePurposes,
  action,
}: PdiItemFormProps) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "")
  const [disciplineId, setDisciplineId] = useState(disciplines[0]?.id ?? "")
  const [documentTypeCategoryId, setDocumentTypeCategoryId] = useState(
    documentTypes[0]?.id ?? ""
  )
  const [releasePurposeId, setReleasePurposeId] = useState(
    releasePurposes[0]?.id ?? ""
  )

  if (
    projects.length === 0 ||
    disciplines.length === 0 ||
    documentTypes.length === 0 ||
    releasePurposes.length === 0
  ) {
    return null
  }

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="pdi-project">Project</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger id="pdi-project" className="w-full">
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

        <div className="grid gap-2">
          <Label htmlFor="pdi-discipline">Discipline</Label>
          <Select value={disciplineId} onValueChange={setDisciplineId}>
            <SelectTrigger id="pdi-discipline" className="w-full">
              <SelectValue placeholder="Select a discipline" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Disciplines</SelectLabel>
                {disciplines.map((discipline) => (
                  <SelectItem key={discipline.id} value={discipline.id}>
                    {discipline.code} - {discipline.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <input type="hidden" name="disciplineId" value={disciplineId} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="pdi-document-type">Document type</Label>
          <Select
            value={documentTypeCategoryId}
            onValueChange={setDocumentTypeCategoryId}
          >
            <SelectTrigger id="pdi-document-type" className="w-full">
              <SelectValue placeholder="Select a document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Document types</SelectLabel>
                {documentTypes.map((documentType) => (
                  <SelectItem key={documentType.id} value={documentType.id}>
                    {documentType.code} - {documentType.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <input
            type="hidden"
            name="documentTypeCategoryId"
            value={documentTypeCategoryId}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="pdi-release-purpose">Release purpose</Label>
          <Select value={releasePurposeId} onValueChange={setReleasePurposeId}>
            <SelectTrigger id="pdi-release-purpose" className="w-full">
              <SelectValue placeholder="Select a release purpose" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Release purposes</SelectLabel>
                {releasePurposes.map((releasePurpose) => (
                  <SelectItem key={releasePurpose.id} value={releasePurpose.id}>
                    {releasePurpose.code} - {releasePurpose.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <input type="hidden" name="releasePurposeId" value={releasePurposeId} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.2fr]">
        <div className="grid gap-2">
          <Label htmlFor="pdi-title">Document title</Label>
          <Input
            id="pdi-title"
            name="title"
            placeholder="Inspection and test plan for..."
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pdi-revision">Revision</Label>
          <Input id="pdi-revision" name="revision" defaultValue="00" required />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="pdi-tags">Tags</Label>
        <Input
          id="pdi-tags"
          name="tags"
          placeholder="comma, separated, tags"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="pdi-remarks">Remarks</Label>
        <Textarea
          id="pdi-remarks"
          name="remarks"
          placeholder="Optional notes for client numbering or document-control handling."
        />
      </div>

      <SubmitButton label="Create PDI item" pendingLabel="Creating PDI item" />
    </form>
  )
}
