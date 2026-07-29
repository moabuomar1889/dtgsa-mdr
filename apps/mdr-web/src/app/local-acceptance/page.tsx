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
    <main className="min-h-screen bg-[#f2efe7] px-5 py-8 text-[#17332d]">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="overflow-hidden rounded-[2rem] bg-[#17332d] p-8 text-[#f7f0dc] shadow-2xl shadow-[#17332d]/20">
          <p className="font-mono text-xs tracking-[0.24em] text-[#e7b34f] uppercase">
            Phase 16L / loopback only
          </p>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
                Local acceptance control room
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#c8d8d2]">
                Synthetic identities, simulated providers, persistent local
                Drive semantics, and an isolated PostgreSQL demonstration.
              </p>
            </div>
            <span className="rounded-full border border-[#e7b34f]/50 bg-[#e7b34f]/10 px-4 py-2 font-mono text-xs text-[#f7d589]">
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
              className="rounded-3xl border border-[#17332d]/10 bg-[#fffdf7] p-5 shadow-sm"
            >
              <p className="font-mono text-[11px] tracking-widest text-[#6d7c77] uppercase">
                {label}
              </p>
              <p className="mt-3 text-2xl font-semibold">{value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-[2rem] border border-[#17332d]/10 bg-[#fffdf7] p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs tracking-widest text-[#b46b2c] uppercase">
                  Local identity selector
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Work as a synthetic user
                </h2>
              </div>
              <span className="rounded-full bg-[#dce9df] px-3 py-1 text-xs font-semibold">
                {users.length} identities
              </span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {users.map((user) => (
                <form
                  key={user.email}
                  action="/local-acceptance/session"
                  method="post"
                  className="rounded-2xl border border-[#17332d]/10 bg-[#f7f3e9] p-4"
                >
                  <input type="hidden" name="email" value={user.email} />
                  <p className="font-semibold">{user.fullName}</p>
                  <p className="mt-1 font-mono text-xs text-[#6d7c77]">
                    {user.email}
                  </p>
                  <p className="mt-2 text-sm text-[#53635d]">
                    {user.jobTitle ?? "Synthetic local user"}
                  </p>
                  <button
                    type="submit"
                    disabled={!user.isActive}
                    className="mt-4 w-full rounded-xl bg-[#17332d] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {user.isActive ? "Select identity" : "Suspended"}
                  </button>
                </form>
              ))}
            </div>
          </article>

          <div className="grid content-start gap-6">
            <article className="rounded-[2rem] bg-[#e7b34f] p-6 text-[#2f2a1f]">
              <p className="font-mono text-xs tracking-widest uppercase">
                Demo projects
              </p>
              <div className="mt-4 grid gap-3">
                {projects.map((project) => (
                  <div
                    key={project.code}
                    className="rounded-2xl bg-white/45 p-4"
                  >
                    <p className="font-mono text-xs">{project.code}</p>
                    <p className="mt-1 font-semibold">{project.name}</p>
                  </div>
                ))}
              </div>
            </article>
            <article className="rounded-[2rem] border border-[#17332d]/10 bg-[#fffdf7] p-6">
              <p className="font-mono text-xs tracking-widest text-[#6d7c77] uppercase">
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
