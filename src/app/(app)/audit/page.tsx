import { FeaturePlaceholder } from "@/components/app/feature-placeholder"

export default function AuditPage() {
  return (
    <FeaturePlaceholder
      badge="Audit & System Logs"
      title="Audit trails will record business actions and technical failures separately for enterprise traceability."
      description="The schema foundation is ready with immutable business logs and system logs. The next slice will wire real action logging across settings, numbering, workflow, files, and integrations."
      nextSteps={[
        "Write business audit events for entity changes and workflow actions.",
        "Capture technical integration failures with metadata and severity.",
        "Expose searchable read-only admin views with project and client filters.",
      ]}
    />
  )
}
