import { FoundationStatus } from "@dtg/ui"

export default function VerificationFoundationPage() {
  return (
    <FoundationStatus
      title="Verification foundation"
      message="Verification portal foundation — verification engine pending."
    >
      <p>No verification record is loaded. No document data is exposed.</p>
    </FoundationStatus>
  )
}
