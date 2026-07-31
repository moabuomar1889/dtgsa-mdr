import { createHash } from "node:crypto"
import { stableCoverCanonical, type CoverTemplateDocument } from "./index"

// Server-only entry point; see the note on `stableCoverCanonical`.
export function stableCoverSnapshot(template: CoverTemplateDocument) {
  const { snapshot, canonicalJson } = stableCoverCanonical(template)
  return {
    snapshot,
    contentHash: createHash("sha256").update(canonicalJson).digest("hex"),
    canonicalJson,
  }
}
