import { PdiStatus } from "@prisma/client"

export function resolvePdiSentStatus(clientDocumentNumber?: string | null) {
  return clientDocumentNumber
    ? PdiStatus.ClientNumberReceived
    : PdiStatus.ClientNumberPending
}

export function assertPdiPromotionAvailable(
  existingMdrDocument: { id: string } | null,
  currentStatus: PdiStatus
) {
  if (existingMdrDocument) {
    throw new Error("This PDI item has already been promoted into the MDR.")
  }

  if (currentStatus !== PdiStatus.ClientNumberReceived) {
    throw new Error(
      "A PDI item can be promoted only after the official client document number is received."
    )
  }
}

const allowedTransitions: Record<PdiStatus, readonly PdiStatus[]> = {
  [PdiStatus.Draft]: [PdiStatus.SentToClient],
  [PdiStatus.SentToClient]: [
    PdiStatus.ClientNumberPending,
    PdiStatus.ClientNumberReceived,
  ],
  [PdiStatus.ClientNumberPending]: [PdiStatus.ClientNumberReceived],
  [PdiStatus.ClientNumberReceived]: [PdiStatus.ConvertedToMdr],
  [PdiStatus.ConvertedToMdr]: [],
  [PdiStatus.Archived]: [],
}

export function assertPdiTransition(
  currentStatus: PdiStatus,
  nextStatus: PdiStatus
) {
  if (currentStatus === nextStatus) {
    return false
  }

  if (!allowedTransitions[currentStatus].includes(nextStatus)) {
    throw new Error(
      `PDI transition from ${currentStatus} to ${nextStatus} is not allowed.`
    )
  }

  return true
}
