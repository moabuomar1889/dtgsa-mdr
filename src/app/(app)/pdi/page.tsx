import { FeaturePlaceholder } from "@/components/app/feature-placeholder"

export default function PdiPage() {
  return (
    <FeaturePlaceholder
      badge="PDI Module"
      title="The Project Document Index will manage numbered register lines and client numbering collaboration."
      description="The foundation is ready for the PDI phase. The next implementation slice will add CRUD, Excel import/export, secure client collaboration, and PDI-to-MDR promotion."
      nextSteps={[
        "Create per-project PDI registers and line-item CRUD.",
        "Generate DTGSA document numbers from the numbering engine.",
        "Export and import Excel-based PDI data.",
      ]}
    />
  )
}
