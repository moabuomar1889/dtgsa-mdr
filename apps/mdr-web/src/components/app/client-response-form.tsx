"use client"

import { useState } from "react"
import { CLIENT_RESPONSE_FILE_KINDS } from "@dtg/client-response-domain"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Effects = {
  outcomeClass: string
  countsAsApproved: boolean
  finalApproval: boolean
  rectificationRequired: boolean
  newRevisionRequired: boolean
  internalReapprovalRequired: boolean
  resubmissionRequired: boolean
  temporaryUseAllowed: boolean
  closureAllowed: boolean
  newDocumentNumberRequired: boolean
  returnedFileRequired: boolean
  expectedFileKind?: string
}

type Submission = {
  id: string
  submissionNumber: number
  submittedAt: Date
  packageHash: string | null
  documentNumber: string
  title: string
  revisionLabel: string
  projectCode: string
  projectName: string
  policy: {
    id: string
    name: string
    version: number
    codes: Array<{
      id: string
      externalCode: string
      exactWording: string
      internalLabel: string
      effects: Effects
    }>
  } | null
}

export function ClientResponseForm({
  submissions,
  action,
}: {
  submissions: Submission[]
  action: (formData: FormData) => void | Promise<void>
}) {
  const [submissionId, setSubmissionId] = useState(submissions[0]?.id ?? "")
  const selected =
    submissions.find((submission) => submission.id === submissionId) ?? null
  const [responseCodeId, setResponseCodeId] = useState(
    submissions[0]?.policy?.codes[0]?.id ?? ""
  )
  const selectedCode =
    selected?.policy?.codes.find((code) => code.id === responseCodeId) ?? null
  const expectedKind = selectedCode?.effects.expectedFileKind

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="response-submission">Client submission</Label>
        <select
          id="response-submission"
          name="submissionId"
          value={submissionId}
          onChange={(event) => {
            const id = event.target.value
            const next = submissions.find((item) => item.id === id)
            setSubmissionId(id)
            setResponseCodeId(next?.policy?.codes[0]?.id ?? "")
          }}
          className="rounded-md border p-2"
          required
        >
          {submissions.map((submission) => (
            <option key={submission.id} value={submission.id}>
              {submission.projectCode} / {submission.documentNumber} / Rev{" "}
              {submission.revisionLabel} / Submission{" "}
              {submission.submissionNumber}
            </option>
          ))}
        </select>
      </div>

      {!selected?.policy ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
          Publish a client default or project response-code policy before
          registering this response.
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            <Label htmlFor="response-code">Published response code</Label>
            <select
              id="response-code"
              name="responseCodeId"
              value={responseCodeId}
              onChange={(event) => setResponseCodeId(event.target.value)}
              className="rounded-md border p-2"
              required
            >
              {selected.policy.codes.map((code) => (
                <option key={code.id} value={code.id}>
                  {code.externalCode} - {code.internalLabel}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground text-xs">
              {selected.policy.name} / version {selected.policy.version}
            </p>
          </div>

          {selectedCode ? (
            <div className="grid gap-2 rounded-2xl border bg-slate-50 p-4">
              <p className="font-semibold">{selectedCode.exactWording}</p>
              <div className="flex flex-wrap gap-2">
                <Badge>{selectedCode.effects.outcomeClass}</Badge>
                {Object.entries(selectedCode.effects)
                  .filter(
                    ([key, value]) =>
                      key !== "outcomeClass" &&
                      key !== "expectedFileKind" &&
                      value === true
                  )
                  .map(([key]) => (
                    <Badge key={key} variant="outline">
                      {key}
                    </Badge>
                  ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="incoming-reference">Incoming reference</Label>
              <Input
                id="incoming-reference"
                name="incomingReference"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="response-date">Response date</Label>
              <Input
                id="response-date"
                name="responseDate"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reviewer-name">Client reviewer name</Label>
              <Input id="reviewer-name" name="clientReviewerName" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reviewer-date">Client reviewer date</Label>
              <Input id="reviewer-date" name="clientReviewerDate" type="date" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="primary-kind">Primary response file kind</Label>
            <select
              id="primary-kind"
              name="primaryFileKind"
              className="rounded-md border p-2"
              defaultValue={expectedKind ?? "FULL_DOCUMENT"}
            >
              {CLIENT_RESPONSE_FILE_KINDS.map((kind) => (
                <option key={kind}>{kind}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="primary-response-file">Primary Response File</Label>
            <Input
              id="primary-response-file"
              name="primaryFile"
              type="file"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="response-attachments">Attachments</Label>
            <Input
              id="response-attachments"
              name="attachments"
              type="file"
              multiple
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="response-comments">Comments</Label>
            <Textarea id="response-comments" name="comments" />
          </div>
          <SubmitButton
            label="Confirm client response"
            pendingLabel="Hashing and recording"
            disabled={!selectedCode}
          />
        </>
      )}
    </form>
  )
}
