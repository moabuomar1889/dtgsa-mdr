"use client"

import { useActionState, useMemo, useState } from "react"
import type {
  ProjectOnboardingActionState,
  ProjectOnboardingField,
} from "@/lib/forms/project-onboarding"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/dtg/select"
import { Input } from "@/components/dtg/input"
import { Label } from "@/components/dtg/label"
import { SubmitButton } from "@/components/app/submit-button"

type ClientOption = {
  id: string
  code: string
  name: string
}

type FolderOption = {
  folderId: string
  name: string
  code: string
}

type ProjectOnboardingFormProps = {
  clients: ClientOption[]
  folders: FolderOption[]
  action: (
    previousState: ProjectOnboardingActionState,
    formData: FormData
  ) => Promise<ProjectOnboardingActionState>
}

const initialProjectOnboardingActionState: ProjectOnboardingActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
}

function FieldError({
  field,
  state,
}: {
  field: ProjectOnboardingField
  state: ProjectOnboardingActionState
}) {
  const message = state.fieldErrors[field]?.[0]

  if (!message) {
    return null
  }

  return (
    <p id={`${field}-error`} className="text-bad text-xs" role="alert">
      {message}
    </p>
  )
}

export function ProjectOnboardingForm({
  clients,
  folders,
  action,
}: ProjectOnboardingFormProps) {
  const [state, formAction] = useActionState(
    action,
    initialProjectOnboardingActionState
  )
  const firstFolder = folders[0]
  const [clientId, setClientId] = useState(clients[0]?.id ?? "")
  const [folderId, setFolderId] = useState(firstFolder?.folderId ?? "")
  const [code, setCode] = useState(firstFolder?.code ?? "")
  const [name, setName] = useState(firstFolder?.name ?? "")
  const [manualFolderId, setManualFolderId] = useState("")
  const [manualFolderName, setManualFolderName] = useState("")
  const [contractNumber, setContractNumber] = useState("")

  const selectedFolder = useMemo(
    () => folders.find((folder) => folder.folderId === folderId) ?? null,
    [folderId, folders]
  )

  if (clients.length === 0) {
    return null
  }

  return (
    <form action={formAction} className="grid gap-4">
      {state.status === "error" ? (
        <div
          className="border-bad/40 bg-bad/10 text-bad rounded-[8px] border px-3 py-2 text-sm"
          role="alert"
          aria-live="polite"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="project-client">Client</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger
            id="project-client"
            className="w-full"
            aria-invalid={Boolean(state.fieldErrors.clientId)}
            aria-describedby={
              state.fieldErrors.clientId ? "clientId-error" : undefined
            }
          >
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Clients</SelectLabel>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.code} - {client.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <input type="hidden" name="clientId" value={clientId} />
        <FieldError field="clientId" state={state} />
      </div>

      {folders.length > 0 ? (
        <div className="grid gap-2">
          <Label htmlFor="project-folder">Google Drive Project Folder</Label>
          <Select
            value={folderId}
            onValueChange={(value) => {
              const folder =
                folders.find((item) => item.folderId === value) ?? null

              setFolderId(value)

              if (folder) {
                setCode(folder.code)
                setName(folder.name)
              }
            }}
          >
            <SelectTrigger
              id="project-folder"
              className="w-full"
              aria-invalid={Boolean(state.fieldErrors.driveFolderId)}
              aria-describedby={
                state.fieldErrors.driveFolderId
                  ? "driveFolderId-error"
                  : undefined
              }
            >
              <SelectValue placeholder="Select a project folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Unlinked Shared Drive Folders</SelectLabel>
                {folders.map((folder) => (
                  <SelectItem key={folder.folderId} value={folder.folderId}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <input type="hidden" name="driveFolderId" value={folderId} />
          <input
            type="hidden"
            name="driveFolderName"
            value={selectedFolder?.name ?? ""}
          />
          <FieldError field="driveFolderId" state={state} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="manual-folder-id">Google Drive Folder ID</Label>
            <Input
              id="manual-folder-id"
              name="driveFolderId"
              value={manualFolderId}
              onChange={(event) => setManualFolderId(event.target.value)}
              placeholder="Paste the project folder ID"
              required
              aria-invalid={Boolean(state.fieldErrors.driveFolderId)}
              aria-describedby={
                state.fieldErrors.driveFolderId
                  ? "driveFolderId-error"
                  : undefined
              }
            />
            <FieldError field="driveFolderId" state={state} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="manual-folder-name">Google Drive Folder Name</Label>
            <Input
              id="manual-folder-name"
              name="driveFolderName"
              value={manualFolderName}
              onChange={(event) => setManualFolderName(event.target.value)}
              placeholder="PRJ-001-Example Project"
              required
              minLength={2}
              maxLength={255}
              aria-invalid={Boolean(state.fieldErrors.driveFolderName)}
              aria-describedby={
                state.fieldErrors.driveFolderName
                  ? "driveFolderName-error"
                  : undefined
              }
            />
            <FieldError field="driveFolderName" state={state} />
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="project-code">Project Code</Label>
          <Input
            id="project-code"
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="PRJ-001"
            required
            minLength={2}
            maxLength={40}
            aria-invalid={Boolean(state.fieldErrors.code)}
            aria-describedby={state.fieldErrors.code ? "code-error" : undefined}
          />
          <FieldError field="code" state={state} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="project-contract">Contract Number</Label>
          <Input
            id="project-contract"
            name="contractNumber"
            value={contractNumber}
            onChange={(event) => setContractNumber(event.target.value)}
            placeholder="Optional contract number"
            maxLength={100}
            aria-invalid={Boolean(state.fieldErrors.contractNumber)}
            aria-describedby={
              state.fieldErrors.contractNumber
                ? "contractNumber-error"
                : undefined
            }
          />
          <FieldError field="contractNumber" state={state} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="project-name">Project Name</Label>
        <Input
          id="project-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Project name"
          required
          minLength={2}
          maxLength={180}
          aria-invalid={Boolean(state.fieldErrors.name)}
          aria-describedby={state.fieldErrors.name ? "name-error" : undefined}
        />
        <FieldError field="name" state={state} />
      </div>

      <SubmitButton label="Create Project" pendingLabel="Creating project" />
    </form>
  )
}
