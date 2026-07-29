import { loadFoundationConfiguration } from "@dtg/configuration"
import { writeLog } from "@dtg/observability"

export type WorkerHealth = {
  started: boolean
  ready: boolean
  stopping: boolean
}

export function createWorkerRuntime(
  env: NodeJS.ProcessEnv = process.env,
  writer: (line: string) => void = console.log
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
        details: { build: configuration.build, jobsRegistered: 0 },
      },
      writer
    )
    return { ...health }
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
  }
}
