import { loadFoundationConfiguration } from "@dtg/configuration"
import { assertLocalProviderConfiguration } from "@dtg/local-acceptance"
import { createHealthResponse, createReadinessResponse } from "@dtg/contracts"

if (process.env.LOCAL_ACCEPTANCE_MODE === "true") {
  assertLocalProviderConfiguration(process.env)
}

export const verifyConfiguration = loadFoundationConfiguration(
  "verify-web",
  process.env,
  3002
)

export function getVerifyHealth() {
  return createHealthResponse(verifyConfiguration.application)
}

export function getVerifyReadiness() {
  return createReadinessResponse(verifyConfiguration.application)
}
