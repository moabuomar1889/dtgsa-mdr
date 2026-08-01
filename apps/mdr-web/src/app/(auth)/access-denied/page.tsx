import Link from "next/link"
import { ArrowRightIcon, LockKeyholeIcon, ShieldCheckIcon } from "lucide-react"
import { Button } from "@/components/dtg/button"

type AccessDeniedPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function AccessDeniedPage({
  searchParams,
}: AccessDeniedPageProps) {
  const params = (await searchParams) ?? {}
  const reason = Array.isArray(params.reason) ? params.reason[0] : params.reason
  const accountNotAssigned = reason === "not-authorized"

  return (
    <section className="border-line bg-panel relative overflow-hidden rounded-[18px] border shadow-[var(--shadow)]">
      <div className="via-accent absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent" />
      <div className="grid min-h-[560px] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border-line bg-head flex flex-col justify-between border-b p-8 lg:border-r lg:border-b-0 lg:p-12">
          <div>
            <div className="border-accent-line bg-accent-bg text-accent-txt inline-flex size-11 items-center justify-center rounded-[12px] border">
              <LockKeyholeIcon className="size-5" aria-hidden="true" />
            </div>
            <p className="text-accent-txt mt-8 font-mono text-[10px] tracking-[0.12em] uppercase">
              Protected workspace
            </p>
            <h1 className="mt-3 max-w-md text-[30px] leading-tight font-medium tracking-[-0.035em] md:text-[38px]">
              We could not open your document control workspace.
            </h1>
          </div>
          <div className="text-soft mt-10 flex items-center gap-2 text-[11.5px]">
            <ShieldCheckIcon className="text-ok size-4" aria-hidden="true" />
            Identity is verified at the DTGSA access boundary.
          </div>
        </div>

        <div className="flex items-center p-8 lg:p-12">
          <div className="max-w-lg">
            <p className="text-dim font-mono text-[10px] tracking-[0.12em] uppercase">
              Access unavailable
            </p>
            <h2 className="mt-3 text-[20px] font-medium tracking-[-0.02em]">
              {accountNotAssigned
                ? "Your work account is not assigned to this application."
                : "Your secure identity could not be confirmed."}
            </h2>
            <p className="text-soft mt-3 text-[13px] leading-6">
              {accountNotAssigned
                ? "Ask the document control administrator to activate your user record or assign the correct project role."
                : "Return through the protected application address and try again. If the issue continues, contact the DTG platform administrator."}
            </p>
            <Button asChild size="lg" className="mt-7 gap-2">
              <Link href="/sign-in">
                Try secure access again
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <p className="text-dim mt-5 text-[11.5px] leading-5">
              For your security, this page never displays token details or
              confirms other user accounts.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
