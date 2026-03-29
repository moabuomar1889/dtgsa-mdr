import { FeaturePlaceholder } from "@/components/app/feature-placeholder"

export default function SettingsPage() {
  return (
    <FeaturePlaceholder
      badge="Settings Hierarchy"
      title="Global, client, and project settings will inherit cleanly with explicit overrides."
      description="The schema already separates global defaults from client and project settings. The next UI slice will expose editable settings, template preferences, file-size limits, and workflow defaults."
      nextSteps={[
        "Manage global masters, defaults, and platform-level settings.",
        "Override settings safely at client and project level.",
        "Track all settings changes through the audit layer.",
      ]}
    />
  )
}
