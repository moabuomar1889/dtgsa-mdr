import { z } from "zod"

export const WORK_REGISTER_STATUSES = [
  "Reported",
  "Investigating",
  "Planned",
  "InProgress",
  "Blocked",
  "Fixed",
  "Verified",
  "Closed",
] as const

export const WORK_REGISTER_PRIORITIES = [
  "Critical",
  "High",
  "Medium",
  "Low",
] as const

export const WORK_REGISTER_CATEGORIES = [
  "Bug",
  "Workflow",
  "UserExperience",
  "Performance",
  "Data",
  "Security",
  "Feature",
  "Other",
] as const

export const WORK_REGISTER_DEPLOYMENT_STATUSES = [
  "NotDeployed",
  "Staging",
  "Production",
] as const

export type WorkRegisterStatusValue = (typeof WORK_REGISTER_STATUSES)[number]
export type WorkRegisterCategoryValue =
  (typeof WORK_REGISTER_CATEGORIES)[number]

export const workRegisterCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(4, "Give the comment a short, specific title.")
    .max(140, "Keep the title to 140 characters or fewer."),
  description: z
    .string()
    .trim()
    .min(10, "Describe what happened and what you expected instead.")
    .max(4000, "Keep the description to 4,000 characters or fewer."),
  area: z
    .string()
    .trim()
    .max(160, "Keep the page or area to 160 characters or fewer.")
    .optional(),
  category: z.enum(WORK_REGISTER_CATEGORIES),
  priority: z.enum(WORK_REGISTER_PRIORITIES),
})

export const workRegisterCommentSchema = z.object({
  itemId: z.string().trim().min(1),
  body: z
    .string()
    .trim()
    .min(2, "Write a comment before posting.")
    .max(3000, "Keep comments to 3,000 characters or fewer."),
})

export function splitEvidenceLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export const workRegisterUpdateSchema = z
  .object({
    itemId: z.string().trim().min(1),
    status: z.enum(WORK_REGISTER_STATUSES),
    priority: z.enum(WORK_REGISTER_PRIORITIES),
    category: z.enum(WORK_REGISTER_CATEGORIES),
    workPack: z.string().trim().max(120).optional(),
    assigneeUserId: z.string().trim().optional(),
    rootCause: z.string().trim().max(4000).optional(),
    fixSummary: z.string().trim().max(4000).optional(),
    fileReferences: z.string().max(9000).optional(),
    testEvidence: z.string().max(9000).optional(),
    commitSha: z.string().trim().max(120).optional(),
    deploymentStatus: z.enum(WORK_REGISTER_DEPLOYMENT_STATUSES),
    remainingRisks: z.string().trim().max(3000).optional(),
    updateNote: z
      .string()
      .trim()
      .min(3, "Explain what changed in this update.")
      .max(1000),
  })
  .superRefine((value, context) => {
    if (!["Fixed", "Verified", "Closed"].includes(value.status)) {
      return
    }

    const fileReferences = splitEvidenceLines(value.fileReferences ?? "")
    const testEvidence = splitEvidenceLines(value.testEvidence ?? "")

    if (!value.fixSummary) {
      context.addIssue({
        code: "custom",
        path: ["fixSummary"],
        message: "Fixed work requires a fix summary.",
      })
    }
    if (!fileReferences.some((reference) => /:\d+(?::\d+)?$/.test(reference))) {
      context.addIssue({
        code: "custom",
        path: ["fileReferences"],
        message: "Add at least one exact file:line reference.",
      })
    }
    if (testEvidence.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["testEvidence"],
        message: "Fixed work requires test or verification evidence.",
      })
    }
    if (["Verified", "Closed"].includes(value.status) && !value.commitSha) {
      context.addIssue({
        code: "custom",
        path: ["commitSha"],
        message: "Verified work requires a commit reference.",
      })
    }
    if (value.status === "Closed" && value.deploymentStatus !== "Production") {
      context.addIssue({
        code: "custom",
        path: ["deploymentStatus"],
        message: "Close an item only after it reaches production.",
      })
    }
  })

export type WorkRegisterCreateField = keyof z.infer<
  typeof workRegisterCreateSchema
>

export type WorkRegisterCreateActionState = {
  status: "idle" | "error"
  message: string
  fieldErrors: Partial<Record<WorkRegisterCreateField, string[]>>
}

export function isWorkRegisterStatus(
  value: string | undefined
): value is WorkRegisterStatusValue {
  return WORK_REGISTER_STATUSES.includes(value as WorkRegisterStatusValue)
}

export function isWorkRegisterCategory(
  value: string | undefined
): value is WorkRegisterCategoryValue {
  return WORK_REGISTER_CATEGORIES.includes(value as WorkRegisterCategoryValue)
}
