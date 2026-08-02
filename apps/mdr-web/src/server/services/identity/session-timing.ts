export type InternalSessionTimingInput = {
  authenticatedAt?: Date
  startedAt?: Date
  internalSessionTtlMinutes: number
  recentAuthWindowMinutes: number
}

/// Keeps the provider authentication time as audit/freshness evidence while
/// starting the application session from the time the assertion is verified.
/// A long-lived Cloudflare Access assertion can be older than the application
/// session TTL; basing the session expiry on that assertion would create an
/// already-expired row and violate the database expiry constraint.
export function deriveInternalSessionTiming(
  input: InternalSessionTimingInput
) {
  const startedAt = input.startedAt ?? new Date()
  const authenticatedAt = input.authenticatedAt ?? startedAt

  return {
    startedAt,
    authenticatedAt,
    expiresAt: new Date(
      startedAt.getTime() + input.internalSessionTtlMinutes * 60_000
    ),
    recentAuthExpiresAt: new Date(
      authenticatedAt.getTime() + input.recentAuthWindowMinutes * 60_000
    ),
  }
}
