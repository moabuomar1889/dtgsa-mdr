"use client"

import type { ReactNode } from "react"
import {
  FilePlus2Icon,
  ListChecksIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
} from "lucide-react"
import { Button } from "@/components/dtg/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/dtg/sheet"

export type RegisterWorkspaceMetric = {
  label: string
  value: ReactNode
}

export type RegisterWorkspaceAction = {
  label: string
  title: string
  description: string
  panel: ReactNode
  intent?: "create" | "configure" | "filter"
  variant?: "default" | "outline"
  width?: "md" | "lg" | "xl"
}

type RegisterWorkspaceProps = {
  eyebrow: string
  title: string
  description: string
  metrics: RegisterWorkspaceMetric[]
  actions?: RegisterWorkspaceAction[]
  children: ReactNode
}

function ActionIcon({
  intent,
}: {
  intent?: RegisterWorkspaceAction["intent"]
}) {
  if (intent === "configure") {
    return <Settings2Icon className="size-3.5" aria-hidden="true" />
  }
  if (intent === "filter") {
    return <SlidersHorizontalIcon className="size-3.5" aria-hidden="true" />
  }
  return <FilePlus2Icon className="size-3.5" aria-hidden="true" />
}

const sheetWidths = {
  md: "sm:!max-w-[520px]",
  lg: "sm:!max-w-[640px]",
  xl: "sm:!max-w-[760px]",
} as const

function metricGridClass(count: number) {
  if (count <= 1) return "grid-cols-1"
  if (count === 2) return "grid-cols-2"
  if (count === 3) return "grid-cols-2 md:grid-cols-3"
  return "grid-cols-2 md:grid-cols-4"
}

function metricCellClass(index: number, count: number) {
  const wrapsOnMobile = count > 2 && index >= 2
  const startsMobileRow = count > 2 && index === 2
  return [
    "border-line px-4 py-3",
    index > 0 && !startsMobileRow ? "border-l" : "",
    startsMobileRow ? "md:border-l" : "",
    wrapsOnMobile ? "border-t md:border-t-0" : "",
  ]
    .filter(Boolean)
    .join(" ")
}

export function RegisterWorkspace({
  eyebrow,
  title,
  description,
  metrics,
  actions = [],
  children,
}: RegisterWorkspaceProps) {
  return (
    <div className="flex flex-1 flex-col gap-3 px-3 py-3 md:px-5 md:py-4">
      <section className="border-line bg-panel overflow-hidden rounded-[12px] border">
        <div className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
          <div className="min-w-0">
            <div className="text-accent-txt flex items-center gap-2 font-mono text-[9px] tracking-[0.1em] uppercase">
              <ListChecksIcon className="size-3.5" aria-hidden="true" />
              {eyebrow}
            </div>
            <h1 className="mt-2 text-[22px] font-medium tracking-[-0.03em] md:text-[26px]">
              {title}
            </h1>
            <p className="text-soft mt-1 max-w-2xl text-[11px] leading-5">
              {description}
            </p>
          </div>

          {actions.length > 0 ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              {actions.map((action) => (
                <Sheet key={action.label}>
                  <SheetTrigger asChild>
                    <Button
                      variant={action.variant ?? "default"}
                      className="gap-2"
                    >
                      <ActionIcon intent={action.intent} />
                      {action.label}
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    className={`!w-full gap-0 overflow-y-auto ${
                      sheetWidths[action.width ?? "lg"]
                    }`}
                    side="right"
                  >
                    <SheetHeader className="border-line border-b pr-12">
                      <SheetTitle>{action.title}</SheetTitle>
                      <SheetDescription>{action.description}</SheetDescription>
                    </SheetHeader>
                    <div className="p-4">{action.panel}</div>
                  </SheetContent>
                </Sheet>
              ))}
            </div>
          ) : null}
        </div>

        {metrics.length > 0 ? (
          <div
            className={`border-line grid border-t ${metricGridClass(metrics.length)}`}
          >
            {metrics.map((metric, index) => (
              <div
                key={metric.label}
                className={metricCellClass(index, metrics.length)}
              >
                <span className="font-mono text-[20px] font-semibold tracking-[-0.04em]">
                  {metric.value}
                </span>
                <span className="text-dim ml-2 text-[9.5px]">
                  {metric.label}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {children}
    </div>
  )
}
