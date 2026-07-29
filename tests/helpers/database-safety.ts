const LOCAL_TEST_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])
const TEST_DATABASE_PATTERN = /(^|[-_.])(test|testing)([-_.]|$)/i
const PRODUCTION_NAME_PATTERN = /(^|[-_.])(prod|production|live)([-_.]|$)/i

export function assertSafeTestDatabaseUrl(
  value: string | undefined,
  approvedRemoteHosts: readonly string[] = []
) {
  if (!value) {
    throw new Error("TEST_DATABASE_URL is required for database-backed tests.")
  }

  const url = new URL(value)
  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""))

  if (!databaseName || !TEST_DATABASE_PATTERN.test(databaseName)) {
    throw new Error(
      "Database-backed tests require a database name explicitly marked as test."
    )
  }

  if (PRODUCTION_NAME_PATTERN.test(databaseName)) {
    throw new Error("Production-like database names are not allowed for tests.")
  }

  const approvedHosts = new Set([
    ...LOCAL_TEST_HOSTS,
    ...approvedRemoteHosts.map((host) => host.toLowerCase()),
  ])

  if (!approvedHosts.has(url.hostname.toLowerCase())) {
    throw new Error(
      `Remote test database host "${url.hostname}" is not explicitly approved.`
    )
  }

  return {
    host: url.hostname,
    databaseName,
  }
}
