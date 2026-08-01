import type { ReactNode } from "react"

export function RegisterPanel({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="border-line bg-panel overflow-hidden rounded-[12px] border">
      <div className="border-line flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[14px] font-semibold tracking-[-0.01em]">
            {title}
          </h2>
          {description ? (
            <p className="text-soft mt-1 text-[10.5px] leading-4">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="p-3 md:p-4">{children}</div>
    </section>
  )
}
