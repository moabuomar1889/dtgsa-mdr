import { notFound } from "next/navigation"
import {
  ArrowRightIcon,
  FileStackIcon,
  FlaskConicalIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { LOCAL_ACCEPTANCE_SEAL } from "@dtg/local-acceptance"
import { prisma } from "@/lib/prisma/client"
import { isLocalAcceptanceEnabled } from "@/server/services/local/local-acceptance-access"

export const dynamic = "force-dynamic"

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

type LocalIdentity = {
  email: string
  fullName: string
  jobTitle: string | null
  isActive: boolean
}

function IdentityChoice({ user }: { user: LocalIdentity }) {
  return (
    <form action="/local-acceptance/session" method="post">
      <input type="hidden" name="email" value={user.email} />
      <button
        type="submit"
        disabled={!user.isActive}
        aria-label={`Enter workspace as ${user.fullName}`}
        className="group border-line bg-raise hover:border-accent-line hover:bg-accent-bg2 flex w-full items-center gap-3 rounded-[11px] border p-3 text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-px disabled:pointer-events-none disabled:opacity-40 md:p-3.5"
      >
        <span className="border-line2 bg-panel2 text-accent-txt flex size-10 shrink-0 items-center justify-center rounded-[10px] border font-mono text-[11px] font-semibold">
          {initials(user.fullName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium">
            {user.fullName}
          </span>
          <span className="text-soft mt-0.5 block truncate text-[10.5px]">
            {user.jobTitle ?? "Synthetic local user"} · {user.email}
          </span>
        </span>
        <span className="border-line bg-panel text-soft group-hover:border-accent-line group-hover:text-accent-txt flex size-8 shrink-0 items-center justify-center rounded-[8px] border transition-colors">
          <ArrowRightIcon className="size-3.5" aria-hidden="true" />
        </span>
      </button>
    </form>
  )
}

export default async function LocalAcceptancePage() {
  if (!isLocalAcceptanceEnabled(process.env)) {
    notFound()
  }

  const users = await prisma.user.findMany({
    where: { email: { endsWith: "@local.test" }, deletedAt: null },
    orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
    select: { email: true, fullName: true, jobTitle: true, isActive: true },
  })
  const primaryIdentity =
    users.find((user) => user.email === "dc.admin@local.test") ?? users[0]
  const alternateIdentities = users.filter(
    (user) => user.email !== primaryIdentity?.email
  )

  return (
    <main className="bg-bg text-text relative min-h-screen overflow-hidden px-4 py-6 md:px-8 md:py-10">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 15% 15%, var(--accent-bg), transparent 30%), radial-gradient(circle at 90% 90%, var(--accent-bg2), transparent 34%)",
        }}
      />
      <div className="border-line bg-panel relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[18px] border shadow-[var(--shadow)] lg:grid-cols-[0.82fr_1.18fr]">
        <section className="border-line bg-head flex flex-col justify-between border-b p-7 lg:border-r lg:border-b-0 lg:p-11">
          <div>
            <div className="flex items-center gap-3">
              <span className="border-accent-line bg-accent-bg text-accent-txt flex size-10 items-center justify-center rounded-[11px] border">
                <FileStackIcon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[13px] font-semibold tracking-[-0.01em]">
                  DTGSA
                </p>
                <p className="text-dim font-mono text-[9.5px] tracking-[0.1em] uppercase">
                  Document Control
                </p>
              </div>
            </div>

            <p className="text-accent-txt mt-12 font-mono text-[10px] tracking-[0.12em] uppercase">
              Local acceptance
            </p>
            <h1 className="mt-3 max-w-md text-[32px] leading-[1.08] font-medium tracking-[-0.04em] md:text-[42px]">
              Enter the workspace as the role you need to test.
            </h1>
            <p className="text-soft mt-5 max-w-md text-[13px] leading-6">
              Each identity opens the same product with its real permissions, so
              you can verify the workflow exactly as that user sees it.
            </p>
          </div>

          <div className="mt-10 space-y-3">
            <div className="text-soft flex items-center gap-2 text-[11.5px]">
              <ShieldCheckIcon className="text-ok size-4" aria-hidden="true" />
              Isolated database and simulated providers
            </div>
            <div className="text-soft flex items-center gap-2 text-[11.5px]">
              <FlaskConicalIcon
                className="text-accent-txt size-4"
                aria-hidden="true"
              />
              Loopback access only, never available in production
            </div>
          </div>
        </section>

        <section className="flex items-center p-5 md:p-8 lg:p-11">
          <div className="w-full">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-dim font-mono text-[9.5px] tracking-[0.11em] uppercase">
                  Test identity
                </p>
                <h2 className="mt-2 text-[20px] font-medium tracking-[-0.025em]">
                  Choose a test role
                </h2>
              </div>
              <span className="border-accent-line bg-accent-bg text-accent-txt rounded-full border px-2.5 py-1 font-mono text-[9.5px]">
                {LOCAL_ACCEPTANCE_SEAL}
              </span>
            </div>

            {primaryIdentity ? <IdentityChoice user={primaryIdentity} /> : null}

            {alternateIdentities.length > 0 ? (
              <details className="group/roles mt-3">
                <summary className="border-line text-soft hover:border-accent-line hover:text-accent-txt flex cursor-pointer list-none items-center justify-between rounded-[10px] border border-dashed px-3.5 py-3 text-[11.5px] transition-colors [&::-webkit-details-marker]:hidden">
                  <span>
                    Choose another role ({alternateIdentities.length})
                  </span>
                  <ArrowRightIcon
                    className="size-3.5 transition-transform group-open/roles:rotate-90"
                    aria-hidden="true"
                  />
                </summary>
                <div className="mt-2.5 grid gap-2.5">
                  {alternateIdentities.map((user) => (
                    <IdentityChoice key={user.email} user={user} />
                  ))}
                </div>
              </details>
            ) : null}
            <p className="text-dim mt-5 text-[10.5px] leading-5">
              Selecting a role starts a fresh internal session and opens your
              role-specific dashboard.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
