import { loadFoundationConfiguration } from "@dtg/configuration"
import { writeLog } from "@dtg/observability"

export type WorkerHealth = {
  started: boolean
  ready: boolean
  stopping: boolean
}

export const registeredJobTypes = ["DRIVE_CONTROLLED_COPY"] as const
export type RegisteredJobType = (typeof registeredJobTypes)[number]

export function createWorkerRuntime(
  env: NodeJS.ProcessEnv = process.env,
  writer: (line: string) => void = console.log,
  handlers: Partial<
    Record<RegisteredJobType, (jobId: string) => Promise<unknown>>
  > = {}
) {
  const configuration = loadFoundationConfiguration("worker", env, 3004)
  const health: WorkerHealth = {
    started: false,
    ready: false,
    stopping: false,
  }

  function start() {
    health.started = true
    health.ready = true
    writeLog(
      {
        level: "info",
        event: "worker.started",
        application: configuration.application,
        details: {
          build: configuration.build,
          jobsRegistered: registeredJobTypes.length,
        },
      },
      writer
    )
    return { ...health }
  }

  async function executeJob(jobType: RegisteredJobType, jobId: string) {
    if (!health.ready) throw new Error("Worker is not ready.")
    const handler = handlers[jobType]
    if (!handler) throw new Error(`Worker handler ${jobType} is unavailable.`)
    return handler(jobId)
  }

  function stop(signal = "internal") {
    health.stopping = true
    health.ready = false
    writeLog(
      {
        level: "info",
        event: "worker.stopped",
        application: configuration.application,
        details: { signal },
      },
      writer
    )
    return { ...health }
  }

  return {
    configuration,
    health,
    start,
    stop,
    executeJob,
    registeredJobTypes,
  }
}
