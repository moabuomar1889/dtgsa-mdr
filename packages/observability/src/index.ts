export type LogLevel = "info" | "warn" | "error"

export type StructuredLogEntry = {
  level: LogLevel
  event: string
  application: string
  timestamp: string
  correlationId?: string
  details?: Record<string, unknown>
}

export function createLogEntry(
  input: Omit<StructuredLogEntry, "timestamp">
): StructuredLogEntry {
  return {
    ...input,
    timestamp: new Date().toISOString(),
  }
}

export function writeLog(
  input: Omit<StructuredLogEntry, "timestamp">,
  writer: (line: string) => void = console.log
) {
  const entry = createLogEntry(input)
  writer(JSON.stringify(entry))
  return entry
}
