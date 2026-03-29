import { FeaturePlaceholder } from "@/components/app/feature-placeholder"

export default function MastersPage() {
  return (
    <FeaturePlaceholder
      badge="Master Data"
      title="Master tables will control disciplines, document types, release purposes, and review codes instead of hardcoded enums."
      description="The first global master data seed is in place. The next slice will add admin screens, import helpers, and inheritance-aware overrides for clients and projects."
      nextSteps={[
        "Maintain global disciplines, document types, and release purposes.",
        "Provide import-friendly admin screens for coding tables.",
        "Propagate system defaults into client and project override layers.",
      ]}
    />
  )
}
