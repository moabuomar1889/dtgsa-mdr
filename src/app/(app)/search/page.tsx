import { FeaturePlaceholder } from "@/components/app/feature-placeholder"

export default function SearchPage() {
  return (
    <FeaturePlaceholder
      badge="Search"
      title="Cross-module search will bring together documents, projects, transmittals, and replies."
      description="The current app shell reserves this space for a global enterprise search experience. Search will become more valuable as core entities start filling with real data."
      nextSteps={[
        "Search across projects, PDI, MDR, and transmittals.",
        "Filter by project, discipline, status, and document number.",
        "Expose quick navigation into the relevant detail pages.",
      ]}
    />
  )
}
