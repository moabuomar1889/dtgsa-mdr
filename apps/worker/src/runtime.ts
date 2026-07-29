import { loadFoundationConfiguration } from "@dtg/configuration"
import {
  JOB_TYPES,
  createWorkerLoop,
  type DurableJobStore,
  type JobHandlers,
  type JobType,
} from "@dtg/job-engine"
import { writeLog } from "@dtg/observability"

export type WorkerHealth = {
  started: boolean
  ready: boolean
  stopping: boolean
}

export const registeredJobTypes = JOB_TYPES
export type RegisteredJobType = JobType

export function createWorkerRuntime(
  env: NodeJS.ProcessEnv = process.env,
  writer: (line: string) => void = console.log,
  handlers: Partial<
    Record<RegisteredJobType, (jobId: string) => Promise<unknown>>
  > = {},
  durable?: {
    store: DurableJobStore
    handlers: JobHandlers
    workerId: string
    pollMs?: number
    leaseMs?: number
  }
) {
  const configuration = loadFoundationConfiguration("worker", env, 3004)
  const health: WorkerHealth = {
    started: false,
    ready: false,
    stopping: false,
  }
  let loop: ReturnType<typeof createWorkerLoop> | null = null

  function start() {
    health.started = true
    health.ready = true
    if (durable) {
      loop = createWorkerLoop({
        ...durable,
        owner: durable.workerId,
        onError(error) {
          writeLog(
            {
              level: "error",
              event: "worker.loop_failed",
              application: configuration.application,
              details: {
                workerId: durable.workerId,
                error:
                  error instanceof Error
                    ? error.message
                    : "Unknown worker error.",
              },
            },
            writer
          )
        },
      })
      void loop.start()
    }
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

  async function stop(signal = "internal") {
    health.stopping = true
    health.ready = false
    if (loop) await loop.stop()
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
