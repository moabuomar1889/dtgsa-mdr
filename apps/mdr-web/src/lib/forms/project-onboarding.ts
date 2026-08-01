import { z } from "zod"

export const projectOnboardingSchema = z.object({
  clientId: z.string().trim().min(1, "Select a client."),
  code: z
    .string()
    .trim()
    .min(2, "Enter a project code with at least 2 characters.")
    .max(40, "Project code must be 40 characters or fewer.")
    .refine(
      (value) => value.replace(/[^A-Z0-9]/gi, "").length >= 2,
      "Project code must contain at least 2 letters or numbers."
    ),
  name: z
    .string()
    .trim()
    .min(2, "Enter a project name with at least 2 characters.")
    .max(180, "Project name must be 180 characters or fewer."),
  contractNumber: z
    .string()
    .trim()
    .max(100, "Contract number must be 100 characters or fewer.")
    .optional(),
  driveFolderId: z.string().trim().min(1, "Select or enter a Drive folder."),
  driveFolderName: z
    .string()
    .trim()
    .min(2, "Enter a Drive folder name with at least 2 characters.")
    .max(255, "Drive folder name must be 255 characters or fewer."),
})

export type ProjectOnboardingField = keyof z.infer<
  typeof projectOnboardingSchema
>

export type ProjectOnboardingActionState = {
  status: "idle" | "error"
  message: string
  fieldErrors: Partial<Record<ProjectOnboardingField, string[]>>
}

export function validateProjectOnboardingInput(input: unknown) {
  return projectOnboardingSchema.safeParse(input)
}

export function projectOnboardingValidationState(
  error: z.ZodError<z.infer<typeof projectOnboardingSchema>>
): ProjectOnboardingActionState {
  return {
    status: "error",
    message: "Check the highlighted fields and try again.",
    fieldErrors: error.flatten().fieldErrors,
  }
}
