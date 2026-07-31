import { createHash } from "node:crypto"
import { responsePolicyContent, type ResponseCodeDefinition } from "./index"

// Server-only entry point. Keeping `node:crypto` out of the package root stops
// bundlers polyfilling Node for any client component that imports a constant
// or a type from this domain.
export function responsePolicySnapshot(input: {
  codeSetId: string
  versionId: string
  version: number
  code: ResponseCodeDefinition
}) {
  const content = responsePolicyContent(input)
  return {
    content,
    hash: createHash("sha256").update(JSON.stringify(content)).digest("hex"),
  }
}
