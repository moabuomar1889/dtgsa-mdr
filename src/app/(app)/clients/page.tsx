import { FeaturePlaceholder } from "@/components/app/feature-placeholder"

export default function ClientsPage() {
  return (
    <FeaturePlaceholder
      badge="Client Management"
      title="Client profiles will hold default disciplines, review codes, numbering rules, contacts, and templates."
      description="The schema is ready for client-scoped overrides. The next slice will add client CRUD, contact management, review code overrides, and client template preferences."
      nextSteps={[
        "Create and maintain client profiles and contacts.",
        "Override default review codes, numbering, and workflow settings.",
        "Prepare client-specific templates for covers and transmittals.",
      ]}
    />
  )
}
