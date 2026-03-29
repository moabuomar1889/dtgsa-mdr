import { FeaturePlaceholder } from "@/components/app/feature-placeholder"

export default function MdrPage() {
  return (
    <FeaturePlaceholder
      badge="MDR Module"
      title="The Master Document Register will become the operational home for revisions, files, and status tracking."
      description="Schema, revision status dimensions, and workflow guardrails are already in place. The next phase will add MDR records, revision histories, and file orchestration."
      nextSteps={[
        "Create active document records from PDI or direct registration.",
        "Track current revision, client reply state, and latest transmittal.",
        "Link source files, cover sheets, merged packages, and audit history.",
      ]}
    />
  )
}
