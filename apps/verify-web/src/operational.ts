import { loadFoundationConfiguration } from "@dtg/configuration"
import {
  createHealthResponse,
  createReadinessResponse,
} from "@dtg/contracts"

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
