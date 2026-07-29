"use client"

import { useState } from "react"
import { Checkbox } from "@/components/dtg/checkbox"
import { Input } from "@/components/dtg/input"
import { Label } from "@/components/dtg/label"
import { Textarea } from "@/components/dtg/textarea"
import { SubmitButton } from "@/components/app/submit-button"

type ReviewCodeFormProps = {
  action: (formData: FormData) => void | Promise<void>
}

function CheckboxField({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/80 p-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
      </div>
    </div>
  )
}

export function ReviewCodeForm({ action }: ReviewCodeFormProps) {
  const [requiresResubmittal, setRequiresResubmittal] = useState(false)
  const [finalizesDocument, setFinalizesDocument] = useState(false)
  const [informationalOnly, setInformationalOnly] = useState(false)

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2 md:grid-cols-[0.55fr_1fr]">
        <div className="grid gap-2">
          <Label htmlFor="review-code">Code</Label>
          <Input id="review-code" name="code" placeholder="1" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="review-label">Label</Label>
          <Input
            id="review-label"
            name="label"
            placeholder="Rejected - Resubmit for Review"
            required
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="review-description">Description</Label>
        <Textarea
          id="review-description"
          name="description"
          placeholder="Describe how this client review code behaves."
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <CheckboxField
          id="requires-resubmittal"
          label="Requires resubmittal"
          checked={requiresResubmittal}
          onCheckedChange={setRequiresResubmittal}
        />
        <CheckboxField
          id="finalizes-document"
          label="Finalizes document"
          checked={finalizesDocument}
          onCheckedChange={setFinalizesDocument}
        />
        <CheckboxField
          id="informational-only"
          label="Informational only"
          checked={informationalOnly}
          onCheckedChange={setInformationalOnly}
        />
      </div>

      <input
        type="hidden"
        name="requiresResubmittal"
        value={String(requiresResubmittal)}
      />
      <input
        type="hidden"
        name="finalizesDocument"
        value={String(finalizesDocument)}
      />
      <input
        type="hidden"
        name="informationalOnly"
        value={String(informationalOnly)}
      />

      <SubmitButton
        label="Add review code"
        pendingLabel="Saving review code"
        className="w-full md:w-auto"
      />
    </form>
  )
}
