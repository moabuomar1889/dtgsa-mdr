import type { ApplicationName, BuildMetadata } from "@dtg/contracts"

export type FoundationConfiguration = {
  application: ApplicationName
  port: number
  environment: string
  build: BuildMetadata
}

function parsePort(value: string | undefined, fallback: number) {
  const port = Number(value ?? fallback)

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535.")
  }

  return port
}

export function loadFoundationConfiguration(
  application: ApplicationName,
  env: NodeJS.ProcessEnv = process.env,
  fallbackPort = 3000
): FoundationConfiguration {
  const environment = env.APP_ENVIRONMENT?.trim() || env.NODE_ENV || "local"

  return {
    application,
    port: parsePort(env.PORT, fallbackPort),
    environment,
    build: {
      application,
      version: env.APP_VERSION?.trim() || "0.1.0",
      gitCommitSha: env.GIT_COMMIT_SHA?.trim() || "local",
      buildTime: env.BUILD_TIME?.trim() || "local",
      environment,
    },
  }
}

export function redactConfiguration(
  configuration: FoundationConfiguration
) {
  return {
    application: configuration.application,
    port: configuration.port,
    environment: configuration.environment,
    build: configuration.build,
  }
}
