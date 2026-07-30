import {
  BellRingIcon,
  FileCheck2Icon,
  FolderKanbanIcon,
  ShieldCheckIcon,
} from "lucide-react"

export const dashboardMetrics = [
  {
    title: "Phase 0 Status",
    value: "In Progress",
    detail: "Runtime, shell, Prisma, and integration baseline are being wired.",
    icon: FolderKanbanIcon,
  },
  {
    title: "Locked Stack",
    value: "Aligned",
    detail: "Next.js 16, React 19, pnpm, DTG Nocturne, Prisma, DOCX, and PDF.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Document Control Scope",
    value: "PDI + MDR",
    detail:
      "Workflow, transmittals, client replies, signatures, and auditability.",
    icon: FileCheck2Icon,
  },
  {
    title: "Pending Inputs",
    value: "Credentials",
    detail:
      "Google Drive, email provider, and template files are still needed.",
    icon: BellRingIcon,
  },
] as const

export const phaseProgress = [
  {
    phase: "Phase 0",
    status: "Active",
    summary:
      "Runtime alignment, app shell, tooling, Prisma foundation, and environment scaffolding.",
  },
  {
    phase: "Phase 1",
    status: "Queued",
    summary:
      "RBAC, users, signatures, clients, projects, disciplines, review codes, numbering rules, audit foundation.",
  },
  {
    phase: "Phase 2",
    status: "Queued",
    summary:
      "PDI register, Excel flows, client numbering portal, and PDI-to-MDR promotion.",
  },
  {
    phase: "Phase 3-7",
    status: "Planned",
    summary:
      "Workflow, covers, PDF tools, transmittals, client replies, Drive mapping, dashboards, and hardening.",
  },
] as const

export const statusDimensions = [
  {
    dimension: "PDI Status",
    rule: "Tracks register collaboration lifecycle only.",
  },
  {
    dimension: "Workflow Status",
    rule: "Tracks internal preparation, review, approval, and DC submission state.",
  },
  {
    dimension: "Revision Status",
    rule: "Tracks revision lifecycle independently from workflow and client response.",
  },
  {
    dimension: "Client Reply State",
    rule: "Tracks whether a client response is pending, recorded, or locked/no action.",
  },
] as const

export const environmentInputs = [
  "Database connection strings",
  "Google Drive service account credentials",
  "Email provider credentials",
  "LibreOffice installation path if not on PATH",
  "Cover sheet and transmittal template files",
] as const
