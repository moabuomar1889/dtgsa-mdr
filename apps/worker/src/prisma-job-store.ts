import { JobState, Prisma, type PrismaClient } from "@prisma/client"
import {
  type DurableJob,
  type DurableJobState,
  type DurableJobStore,
  type JobFailure,
  type JobType,
} from "@dtg/job-engine"

function asDurableJob(job: {
  id: string
  jobType: string
  payload: Prisma.JsonValue
  state: JobState
  attemptCount: number
  maxAttempts: number
  idempotencyKey: string
  correlationId: string | null
  leaseOwner: string | null
  leaseExpiresAt: Date | null
  progress: number
}): DurableJob {
  return {
    id: job.id,
    jobType: job.jobType as JobType,
    payload: job.payload as Record<string, unknown>,
    state: job.state as DurableJobState,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    idempotencyKey: job.idempotencyKey,
    correlationId: job.correlationId ?? undefined,
    leaseOwner: job.leaseOwner ?? undefined,
    leaseExpiresAt: job.leaseExpiresAt ?? undefined,
    progress: job.progress,
  }
}

function errorJson(error: JobFailure): Prisma.InputJsonValue {
  return {
    name: error.name,
    message: error.message,
    retryable: error.retryable,
    code: error.code ?? null,
  }
}

export function createPrismaJobStore(prisma: PrismaClient): DurableJobStore {
  return {
    async enqueue(input) {
      const job = await prisma.backgroundJob.upsert({
        where: { idempotencyKey: input.idempotencyKey },
        create: {
          jobType: input.jobType,
          payload: input.payload as Prisma.InputJsonValue,
          idempotencyKey: input.idempotencyKey,
          correlationId: input.correlationId,
          priority: input.priority ?? 0,
          maxAttempts: input.maxAttempts ?? 5,
        },
        update: {},
      })
      return asDurableJob(job)
    },

    async lease(input) {
      for (let conflict = 0; conflict < 3; conflict += 1) {
        const candidate = await prisma.backgroundJob.findFirst({
          where: {
            cancelRequestedAt: null,
            OR: [
              {
                state: { in: [JobState.Pending, JobState.Failed] },
                nextAttemptAt: { lte: input.now },
              },
              {
                state: JobState.Running,
                leaseExpiresAt: { lte: input.now },
              },
            ],
          },
          orderBy: [{ priority: "desc" }, { nextAttemptAt: "asc" }],
        })
        if (!candidate) return null

        const leaseExpiresAt = new Date(input.now.getTime() + input.leaseMs)
        const claimed = await prisma.backgroundJob.updateMany({
          where: {
            id: candidate.id,
            updatedAt: candidate.updatedAt,
          },
          data: {
            state: JobState.Running,
            attemptCount: { increment: 1 },
            leaseOwner: input.owner,
            leaseExpiresAt,
            heartbeatAt: input.now,
            startedAt: candidate.startedAt ?? input.now,
          },
        })
        if (claimed.count !== 1) continue

        const job = await prisma.backgroundJob.findUniqueOrThrow({
          where: { id: candidate.id },
        })
        await prisma.jobAttempt.create({
          data: {
            jobId: job.id,
            attemptNumber: job.attemptCount,
            leaseOwner: input.owner,
            heartbeatAt: input.now,
          },
        })
        return asDurableJob(job)
      }
      return null
    },

    async heartbeat(input) {
      const updated = await prisma.backgroundJob.updateMany({
        where: {
          id: input.jobId,
          state: JobState.Running,
          leaseOwner: input.owner,
          cancelRequestedAt: null,
        },
        data: {
          heartbeatAt: input.now,
          leaseExpiresAt: new Date(input.now.getTime() + input.leaseMs),
          progress:
            typeof input.progress === "number"
              ? Math.max(0, Math.min(100, input.progress))
              : undefined,
          progressMessage: input.message,
        },
      })
      if (updated.count === 1) {
        await prisma.jobAttempt.updateMany({
          where: {
            jobId: input.jobId,
            completedAt: null,
            leaseOwner: input.owner,
          },
          data: { heartbeatAt: input.now },
        })
      }
      return updated.count === 1
    },

    async complete(input) {
      await prisma.$transaction(async (tx) => {
        const job = await tx.backgroundJob.findFirstOrThrow({
          where: {
            id: input.jobId,
            state: JobState.Running,
            leaseOwner: input.owner,
          },
        })
        await tx.backgroundJob.update({
          where: { id: job.id },
          data: {
            state: job.cancelRequestedAt
              ? JobState.Canceled
              : JobState.Completed,
            progress: job.cancelRequestedAt ? job.progress : 100,
            completedAt: input.now,
            leaseOwner: null,
            leaseExpiresAt: null,
            metrics: input.metrics as Prisma.InputJsonValue | undefined,
          },
        })
        await tx.jobAttempt.updateMany({
          where: {
            jobId: job.id,
            attemptNumber: job.attemptCount,
            completedAt: null,
          },
          data: {
            completedAt: input.now,
            durationMs: Math.max(
              0,
              input.now.getTime() - job.heartbeatAt!.getTime()
            ),
            outcome: job.cancelRequestedAt ? "Canceled" : "Completed",
          },
        })
      })
    },

    async fail(input) {
      return prisma.$transaction(async (tx) => {
        const job = await tx.backgroundJob.findFirstOrThrow({
          where: {
            id: input.jobId,
            state: JobState.Running,
            leaseOwner: input.owner,
          },
        })
        const state = job.cancelRequestedAt
          ? JobState.Canceled
          : !input.error.retryable || job.attemptCount >= job.maxAttempts
            ? JobState.DeadLetter
            : JobState.Failed
        await tx.backgroundJob.update({
          where: { id: job.id },
          data: {
            state,
            nextAttemptAt: input.retryAt ?? job.nextAttemptAt,
            leaseOwner: null,
            leaseExpiresAt: null,
            lastError: errorJson(input.error),
            deadLetteredAt:
              state === JobState.DeadLetter ? input.now : undefined,
            completedAt:
              state === JobState.Canceled || state === JobState.DeadLetter
                ? input.now
                : undefined,
          },
        })
        await tx.jobAttempt.updateMany({
          where: {
            jobId: job.id,
            attemptNumber: job.attemptCount,
            completedAt: null,
          },
          data: {
            completedAt: input.now,
            outcome: state,
            error: errorJson(input.error),
            retryAt: state === JobState.Failed ? input.retryAt : null,
          },
        })
        return state as DurableJobState
      })
    },

    async requestCancellation(jobId, now) {
      const updated = await prisma.backgroundJob.updateMany({
        where: {
          id: jobId,
          state: {
            in: [JobState.Pending, JobState.Failed, JobState.Running],
          },
        },
        data: { cancelRequestedAt: now },
      })
      await prisma.backgroundJob.updateMany({
        where: {
          id: jobId,
          state: { in: [JobState.Pending, JobState.Failed] },
        },
        data: {
          state: JobState.Canceled,
          completedAt: now,
        },
      })
      return updated.count === 1
    },

    async metrics(now) {
      const [queueDepth, running, failed, deadLetters, canceled, retryRows] =
        await Promise.all([
          prisma.backgroundJob.count({
            where: {
              state: { in: [JobState.Pending, JobState.Failed] },
              nextAttemptAt: { lte: now },
            },
          }),
          prisma.backgroundJob.count({ where: { state: JobState.Running } }),
          prisma.backgroundJob.count({ where: { state: JobState.Failed } }),
          prisma.backgroundJob.count({ where: { state: JobState.DeadLetter } }),
          prisma.backgroundJob.count({ where: { state: JobState.Canceled } }),
          prisma.backgroundJob.aggregate({ _sum: { attemptCount: true } }),
        ])
      return {
        queueDepth,
        running,
        failed,
        deadLetters,
        canceled,
        retries: Math.max(
          0,
          (retryRows._sum.attemptCount ?? 0) -
            queueDepth -
            running -
            failed -
            deadLetters -
            canceled
        ),
      }
    },
  }
}
