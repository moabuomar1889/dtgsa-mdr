import { readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { notFound } from "next/navigation"
import { LOCAL_ACCEPTANCE_SEAL } from "@dtg/local-acceptance"
import { prisma } from "@/lib/prisma/client"

export const dynamic = "force-dynamic"

async function runtimeState() {
  const root = process.env.LOCAL_RUNTIME_ROOT
  if (!root) return null
  try {
    return JSON.parse(
      await readFile(join(resolve(root), "state.json"), "utf8")
    ) as {
      startedAt?: string
      services?: Record<string, { url?: string; status?: string }>
    }
  } catch {
    return null
  }
}

export default async function LocalAcceptancePage() {
  if (
    process.env.LOCAL_ACCEPTANCE_MODE !== "true" ||
    process.env.NODE_ENV === "production"
  ) {
    notFound()
  }

  const [users, projects, pendingJobs, failedJobs, state] = await Promise.all([
    prisma.user.findMany({
      where: { email: { endsWith: "@local.test" }, deletedAt: null },
      orderBy: { email: "asc" },
      select: { email: true, fullName: true, jobTitle: true, isActive: true },
    }),
    prisma.project.findMany({
      where: { code: { startsWith: "LOCAL-" }, deletedAt: null },
      orderBy: { code: "asc" },
      select: { code: true, name: true },
    }),
    prisma.backgroundJob.count({ where: { state: "Pending" } }),
    prisma.backgroundJob.count({
      where: { state: { in: ["Failed", "DeadLetter"] } },
    }),
    runtimeState(),
  ])

  return (
    <main className="bg-bg text-text min-h-screen px-5 py-6">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="border-line bg-head overflow-hidden rounded-[9px] border p-6">
          <p className="text-accent-txt font-mono text-[9.5px] tracking-[0.09em] uppercase">
            Phase 16L / loopback only
          </p>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-[22px] font-medium tracking-[-0.02em]">
                Local acceptance control room
              </h1>
              <p className="text-soft mt-3 max-w-3xl text-[12px] leading-5">
                Synthetic identities, simulated providers, persistent local
                Drive semantics, and an isolated PostgreSQL demonstration.
              </p>
            </div>
            <span className="border-accent-line bg-accent-bg text-accent-txt rounded-[4px] border px-2 py-1 font-mono text-[10.5px]">
              {LOCAL_ACCEPTANCE_SEAL}
            </span>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Database", state ? "CONNECTED" : "STARTING"],
            ["Worker queue", `${pendingJobs} PENDING`],
            ["Failed jobs", String(failedJobs)],
            ["Providers", "SIMULATED"],
          ].map(([label, value]) => (
            <article
              key={label}
              className="border-line bg-panel rounded-[9px] border p-4"
            >
              <p className="text-dim font-mono text-[9.5px] tracking-[0.09em] uppercase">
                {label}
              </p>
              <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                {value}
              </p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="border-line bg-panel rounded-[9px] border p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-accent-txt font-mono text-[9.5px] tracking-[0.09em] uppercase">
                  Local identity selector
                </p>
                <h2 className="mt-2 text-[15px] font-medium">
                  Work as a synthetic user
                </h2>
              </div>
              <span className="bg-accent-bg text-accent-txt rounded-full px-2 py-1 font-mono text-[10px] font-semibold">
                {users.length} identities
              </span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {users.map((user) => (
                <form
                  key={user.email}
                  action="/local-acceptance/session"
                  method="post"
                  className="border-line2 bg-raise rounded-[7px] border p-4"
                >
                  <input type="hidden" name="email" value={user.email} />
                  <p className="font-medium">{user.fullName}</p>
                  <p className="text-accent-txt mt-1 font-mono text-[10.5px]">
                    {user.email}
                  </p>
                  <p className="text-soft mt-2 text-[11.5px]">
                    {user.jobTitle ?? "Synthetic local user"}
                  </p>
                  <button
                    type="submit"
                    disabled={!user.isActive}
                    className="border-accent bg-accent text-on-accent mt-4 w-full rounded-[8px] border px-4 py-2 text-[12px] font-medium disabled:opacity-40"
                  >
                    {user.isActive ? "Select identity" : "Suspended"}
                  </button>
                </form>
              ))}
            </div>
          </article>

          <div className="grid content-start gap-6">
            <article className="border-line bg-panel rounded-[9px] border p-5">
              <p className="text-dim font-mono text-[9.5px] tracking-[0.09em] uppercase">
                Demo projects
              </p>
              <div className="mt-4 grid gap-3">
                {projects.map((project) => (
                  <div
                    key={project.code}
                    className="border-line2 bg-raise rounded-[7px] border p-4"
                  >
                    <p className="text-accent font-mono text-[10.5px]">
                      {project.code}
                    </p>
                    <p className="mt-1 font-medium">{project.name}</p>
                  </div>
                ))}
              </div>
            </article>
            <article className="border-line bg-panel rounded-[9px] border p-5">
              <p className="text-dim font-mono text-[9.5px] tracking-[0.09em] uppercase">
                Runtime
              </p>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>Started</dt>
                  <dd className="font-mono text-xs">
                    {state?.startedAt ?? "Not recorded"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Network boundary</dt>
                  <dd className="font-semibold">127.0.0.1</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>External integrations</dt>
                  <dd className="font-semibold">Disabled</dd>
                </div>
              </dl>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}
