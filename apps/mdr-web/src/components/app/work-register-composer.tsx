"use client"

import { useActionState } from "react"
import {
  WORK_REGISTER_CATEGORIES,
  WORK_REGISTER_PRIORITIES,
  type WorkRegisterCreateActionState,
  type WorkRegisterCreateField,
} from "@/lib/forms/work-register"
import { Input } from "@/components/dtg/input"
import { Label } from "@/components/dtg/label"
import { Textarea } from "@/components/dtg/textarea"
import { SubmitButton } from "@/components/app/submit-button"

const initialState: WorkRegisterCreateActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
}

const categoryLabels = {
  Bug: "Something is broken",
  Workflow: "Workflow is difficult",
  UserExperience: "Page is unclear or heavy",
  Performance: "Page is slow",
  Data: "Data is wrong or missing",
  Security: "Security or access concern",
  Feature: "New capability",
  Other: "Other",
} as const

function FieldError({
  field,
  state,
}: {
  field: WorkRegisterCreateField
  state: WorkRegisterCreateActionState
}) {
  const error = state.fieldErrors[field]?.[0]
  return error ? (
    <p className="text-bad text-[11px]" role="alert">
      {error}
    </p>
  ) : null
}

export function WorkRegisterComposer({
  action,
}: {
  action: (
    previousState: WorkRegisterCreateActionState,
    formData: FormData
  ) => Promise<WorkRegisterCreateActionState>
}) {
  const [state, formAction] = useActionState(action, initialState)

  return (
    <form action={formAction} className="grid gap-4">
      {state.status === "error" ? (
        <div
          className="border-bad/40 bg-bad/10 text-bad rounded-[8px] border px-3 py-2 text-[12px]"
          role="alert"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-1.5">
        <Label htmlFor="work-register-title">Short title</Label>
        <Input
          id="work-register-title"
          name="title"
          placeholder="Example: Creating a project shows a blank page"
          minLength={4}
          maxLength={140}
          required
          aria-invalid={Boolean(state.fieldErrors.title)}
        />
        <FieldError field="title" state={state} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="work-register-description">What happened?</Label>
        <Textarea
          id="work-register-description"
          name="description"
          className="min-h-32 resize-y leading-5"
          placeholder="Tell us what you were trying to do, what happened, and what you expected instead. Plain language is welcome."
          minLength={10}
          maxLength={4000}
          required
          aria-invalid={Boolean(state.fieldErrors.description)}
        />
        <FieldError field="description" state={state} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="work-register-area">Page or area</Label>
          <Input
            id="work-register-area"
            name="area"
            placeholder="Projects / New Project"
            maxLength={160}
            aria-invalid={Boolean(state.fieldErrors.area)}
          />
          <FieldError field="area" state={state} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="work-register-category">Type</Label>
          <select
            id="work-register-category"
            name="category"
            defaultValue="Bug"
            className="border-edge bg-raise text-text focus-visible:border-accent h-8 rounded-[8px] border px-2.5 text-[12px] outline-none"
          >
            {WORK_REGISTER_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-[11px] font-medium">Impact</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WORK_REGISTER_PRIORITIES.map((priority) => (
            <label
              key={priority}
              className="border-edge bg-raise has-checked:border-accent has-checked:bg-accent-bg flex cursor-pointer items-center justify-center rounded-[8px] border px-2 py-2 text-[11px]"
            >
              <input
                type="radio"
                name="priority"
                value={priority}
                defaultChecked={priority === "Medium"}
                className="sr-only"
              />
              {priority}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="border-line flex items-center justify-between gap-4 border-t pt-4">
        <p className="text-dim max-w-60 text-[10.5px] leading-4">
          Your comment becomes a numbered item. Updates and evidence remain
          visible to everyone.
        </p>
        <SubmitButton label="Add to register" pendingLabel="Recording" />
      </div>
    </form>
  )
}
