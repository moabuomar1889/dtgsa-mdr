import { loadFoundationConfiguration } from "@dtg/configuration"
import { assertLocalProviderConfiguration } from "@dtg/local-acceptance"
import { createHealthResponse, createReadinessResponse } from "@dtg/contracts"

if (process.env.LOCAL_ACCEPTANCE_MODE === "true") {
  assertLocalProviderConfiguration(process.env)
}

export const approveConfiguration = loadFoundationConfiguration(
  "approve-web",
  process.env,
  3001
)

export function getApproveHealth() {
  return createHealthResponse(approveConfiguration.application)
}

export function getApproveReadiness() {
  return createReadinessResponse(approveConfiguration.application)
}
