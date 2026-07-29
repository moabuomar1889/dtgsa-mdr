"use client"

import { useMemo, useState } from "react"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/dtg/badge"
import { Input } from "@/components/dtg/input"
import { Label } from "@/components/dtg/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/dtg/select"
import { Textarea } from "@/components/dtg/textarea"

const CLIENT_REPLY_NEXT_ACTION = {
  REVISION_REQUIRED: "REVISION_REQUIRED",
  NEW_DOCUMENT_NUMBER_REQUIRED: "NEW_DOCUMENT_NUMBER_REQUIRED",
  NO_FURTHER_ACTION: "NO_FURTHER_ACTION",
} as const

const DRIVE_FOLDER_TYPE = {
  RECEIVED: "RECEIVED",
  REJECTED: "REJECTED",
  REVISIONS: "REVISIONS",
} as const

type ClientReplyNextActionValue =
  (typeof CLIENT_REPLY_NEXT_ACTION)[keyof typeof CLIENT_REPLY_NEXT_ACTION]

type DriveFolderTypeValue =
  (typeof DRIVE_FOLDER_TYPE)[keyof typeof DRIVE_FOLDER_TYPE]

type DocumentOption = {
  id: string
  projectId: string
  projectCode: string
  projectName: string
  clientCode: string
  clientName: string
  dtgsaDocumentNumber: string
  clientDocumentNumber: string | null
  title: string
  currentRevisionLabel: string
  reviewCodes: Array<{
    id: string
    code: string
    label: string
    description: string | null
    requiresResubmittal: boolean
    finalizesDocument: boolean
    informationalOnly: boolean
  }>
  transmittals: Array<{
    id: string
    transmittalNumber: string
    status: string
  }>
}

type ClientReplyFormProps = {
  documents: DocumentOption[]
  action: (formData: FormData) => void | Promise<void>
}

export function ClientReplyForm({
  documents,
  action,
}: ClientReplyFormProps) {
  const [documentId, setDocumentId] = useState(documents[0]?.id ?? "")
  const [reviewCodeId, setReviewCodeId] = useState(
    documents[0]?.reviewCodes[0]?.id ?? ""
  )
  const [transmittalId, setTransmittalId] = useState(
    documents[0]?.transmittals[0]?.id ?? ""
  )
  const [nextAction, setNextAction] = useState<ClientReplyNextActionValue>(
    CLIENT_REPLY_NEXT_ACTION.NO_FURTHER_ACTION
  )
  const [driveTargetFolderType, setDriveTargetFolderType] =
    useState<DriveFolderTypeValue>(DRIVE_FOLDER_TYPE.RECEIVED)

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === documentId) ?? null,
    [documentId, documents]
  )
  const selectedReviewCode = useMemo(
    () =>
      selectedDocument?.reviewCodes.find((code) => code.id === reviewCodeId) ?? null,
    [reviewCodeId, selectedDocument]
  )

  function applyReviewCodeDefaults(
    reviewCode:
      | {
          requiresResubmittal: boolean
        }
      | null
      | undefined
  ) {
    if (!reviewCode) {
      setNextAction(CLIENT_REPLY_NEXT_ACTION.NO_FURTHER_ACTION)
      setDriveTargetFolderType(DRIVE_FOLDER_TYPE.RECEIVED)
      return
    }

    if (reviewCode.requiresResubmittal) {
      setNextAction(CLIENT_REPLY_NEXT_ACTION.REVISION_REQUIRED)
      setDriveTargetFolderType(DRIVE_FOLDER_TYPE.REJECTED)
      return
    }

    setNextAction(CLIENT_REPLY_NEXT_ACTION.NO_FURTHER_ACTION)
    setDriveTargetFolderType(DRIVE_FOLDER_TYPE.RECEIVED)
  }

  if (documents.length === 0) {
    return null
  }

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="reply-document">Submitted document</Label>
        <Select
          value={documentId}
          onValueChange={(value) => {
            const nextDocument =
              documents.find((document) => document.id === value) ?? null

            setDocumentId(value)
            setReviewCodeId(nextDocument?.reviewCodes[0]?.id ?? "")
            setTransmittalId(nextDocument?.transmittals[0]?.id ?? "")
            applyReviewCodeDefaults(nextDocument?.reviewCodes[0] ?? null)
          }}
        >
          <SelectTrigger id="reply-document" className="w-full">
            <SelectValue placeholder="Select a document" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Submitted documents</SelectLabel>
              {documents.map((document) => (
                <SelectItem key={document.id} value={document.id}>
                  {document.projectCode} / {document.dtgsaDocumentNumber}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <input type="hidden" name="documentId" value={documentId} />
        {selectedDocument ? (
          <div className="rounded-2xl border border-border/60 bg-background/70 p-3 text-sm">
            <p className="font-medium">{selectedDocument.title}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>
                {selectedDocument.projectCode} - {selectedDocument.projectName}
              </span>
              <span>{selectedDocument.dtgsaDocumentNumber}</span>
              <span>Rev {selectedDocument.currentRevisionLabel}</span>
              <span>
                Client No: {selectedDocument.clientDocumentNumber ?? "Pending"}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="reply-code">Review code</Label>
          <Select
            value={reviewCodeId}
            onValueChange={(value) => {
              const nextReviewCode =
                selectedDocument?.reviewCodes.find((code) => code.id === value) ??
                null

              setReviewCodeId(value)
              applyReviewCodeDefaults(nextReviewCode)
            }}
          >
            <SelectTrigger id="reply-code" className="w-full">
              <SelectValue placeholder="Select review code" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Review codes</SelectLabel>
                {selectedDocument?.reviewCodes.map((reviewCode) => (
                  <SelectItem key={reviewCode.id} value={reviewCode.id}>
                    Code {reviewCode.code} - {reviewCode.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <input type="hidden" name="reviewCodeId" value={reviewCodeId} />
          {selectedReviewCode?.description ? (
            <p className="text-xs text-muted-foreground">
              {selectedReviewCode.description}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="reply-transmittal">Transmittal</Label>
          <Select value={transmittalId} onValueChange={setTransmittalId}>
            <SelectTrigger id="reply-transmittal" className="w-full">
              <SelectValue placeholder="Optional transmittal link" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Sent transmittals</SelectLabel>
                {selectedDocument?.transmittals.length ? (
                  selectedDocument.transmittals.map((transmittal) => (
                    <SelectItem key={transmittal.id} value={transmittal.id}>
                      {transmittal.transmittalNumber}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="__none" disabled>
                    No sent transmittal found
                  </SelectItem>
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
          <input
            type="hidden"
            name="transmittalId"
            value={transmittalId === "__none" ? "" : transmittalId}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="reply-next-action">Next action</Label>
          <Select
            value={nextAction}
            onValueChange={(value) =>
              setNextAction(value as ClientReplyNextActionValue)
            }
          >
            <SelectTrigger id="reply-next-action" className="w-full">
              <SelectValue placeholder="Select next action" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Follow-up</SelectLabel>
                <SelectItem value={CLIENT_REPLY_NEXT_ACTION.REVISION_REQUIRED}>
                  Same document number, new revision
                </SelectItem>
                <SelectItem
                  value={CLIENT_REPLY_NEXT_ACTION.NEW_DOCUMENT_NUMBER_REQUIRED}
                >
                  New DTGSA document number
                </SelectItem>
                <SelectItem value={CLIENT_REPLY_NEXT_ACTION.NO_FURTHER_ACTION}>
                  No further action
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <input type="hidden" name="nextAction" value={nextAction} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="reply-folder-type">Drive folder type</Label>
          <Select
            value={driveTargetFolderType}
            onValueChange={(value) =>
              setDriveTargetFolderType(value as DriveFolderTypeValue)
            }
          >
            <SelectTrigger id="reply-folder-type" className="w-full">
              <SelectValue placeholder="Choose a folder type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Folder types</SelectLabel>
                <SelectItem value={DRIVE_FOLDER_TYPE.RECEIVED}>Received</SelectItem>
                <SelectItem value={DRIVE_FOLDER_TYPE.REJECTED}>Rejected</SelectItem>
                <SelectItem value={DRIVE_FOLDER_TYPE.REVISIONS}>Revisions</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <input
            type="hidden"
            name="driveTargetFolderType"
            value={driveTargetFolderType}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.3fr_0.7fr]">
        <div className="grid gap-2">
          <Label htmlFor="reply-date">Reply date</Label>
          <Input
            id="reply-date"
            name="replyDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reply-file-name">Returned file name</Label>
          <Input
            id="reply-file-name"
            name="returnedFileName"
            placeholder="Optional original returned file name"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="reply-file">Returned client file</Label>
        <Input
          id="reply-file"
          name="file"
          type="file"
          accept=".pdf,.doc,.docx,.xlsx,.xls,.zip,image/*"
        />
        <p className="text-xs text-muted-foreground">
          Upload the reviewed client file here. Rejected PDFs will be renamed automatically using the
          required <code>Rej-XXXXXXXXXXX.pdf</code> rule before they are mirrored into Drive.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="reply-comments">Comments</Label>
        <Textarea
          id="reply-comments"
          name="comments"
          placeholder="Client comments, return notes, or revision reason."
        />
      </div>

      {selectedReviewCode ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
          <Badge variant="outline">Code {selectedReviewCode.code}</Badge>
          <span>
            {selectedReviewCode.requiresResubmittal
              ? "This code requires resubmittal."
              : selectedReviewCode.finalizesDocument
                ? "This code finalizes and locks the document."
                : selectedReviewCode.informationalOnly
                  ? "This code is informational only."
                  : "This code records a general reply."}
          </span>
        </div>
      ) : null}

      <SubmitButton
        label="Record client reply"
        pendingLabel="Recording reply"
        disabled={!documentId || !reviewCodeId}
      />
    </form>
  )
}
