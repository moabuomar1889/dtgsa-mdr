import { loadFoundationConfiguration } from "@dtg/configuration"
import {
  createHealthResponse,
  createReadinessResponse,
} from "@dtg/contracts"

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
