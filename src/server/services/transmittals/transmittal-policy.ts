import "server-only"

import { DocumentFileType } from "@prisma/client"

export function pickPreferredAttachmentFile(
  files: Array<{
    id: string
    type: DocumentFileType
    fileName: string
    fileSizeBytes: number
  }>
) {
  const priority = [
    DocumentFileType.MERGED,
    DocumentFileType.REVISION_SOURCE,
    DocumentFileType.SOURCE,
    DocumentFileType.PREVIEW,
  ]

  for (const type of priority) {
    const file = files.find((item) => item.type === type)

    if (file) {
      return file
    }
  }

  return files[0] ?? null
}

export function resolveTransmittalMaxBytes(input: {
  projectOverrideMb?: number | null
  clientDefaultMb?: number | null
  defaultMaxMb: number
}) {
  const maxMb =
    input.projectOverrideMb ?? input.clientDefaultMb ?? input.defaultMaxMb

  return maxMb * 1024 * 1024
}

export function extractEmailRecipients(
  ...values: Array<string | null | undefined>
) {
  const regex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
  const recipients = new Set<string>()

  for (const value of values) {
    if (!value) {
      continue
    }

    for (const match of value.match(regex) ?? []) {
      recipients.add(match.toLowerCase())
    }
  }

  return Array.from(recipients)
}
