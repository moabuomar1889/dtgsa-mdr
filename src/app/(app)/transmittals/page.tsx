import { FeaturePlaceholder } from "@/components/app/feature-placeholder"

export default function TransmittalsPage() {
  return (
    <FeaturePlaceholder
      badge="Transmittal Module"
      title="External transmittals will package approved revisions, validate size limits, and issue client-facing records."
      description="The database and numbering foundation are ready. The next implementation slice will build the transmittal composer, attachment validation, PDF output, and email sending."
      nextSteps={[
        "Select multiple approved revisions for a single outbound package.",
        "Enforce configurable total attachment size limits before send.",
        "Generate and store a transmittal PDF with document linkage.",
      ]}
    />
  )
}
