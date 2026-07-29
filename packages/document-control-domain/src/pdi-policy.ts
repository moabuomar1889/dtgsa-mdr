import { PdiStatus } from "@prisma/client"

export function resolvePdiSentStatus(clientDocumentNumber?: string | null) {
  return clientDocumentNumber
    ? PdiStatus.ClientNumberReceived
    : PdiStatus.ClientNumberPending
}

export function assertPdiPromotionAvailable(
  existingMdrDocument: { id: string } | null
) {
  if (existingMdrDocument) {
    throw new Error("This PDI item has already been promoted into the MDR.")
  }
}
