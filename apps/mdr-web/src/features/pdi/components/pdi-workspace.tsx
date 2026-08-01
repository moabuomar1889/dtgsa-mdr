"use client"

import type { ReactNode } from "react"
import {
  FilePlus2Icon,
  FileSpreadsheetIcon,
  ListChecksIcon,
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

type PdiWorkspaceProps = {
  counts: {
    total: number
    pendingClientNumber: number
    clientNumberReceived: number
    converted: number
  }
  canCreate: boolean
  canTransfer: boolean
  createPanel: ReactNode
  transferPanel: ReactNode
  children: ReactNode
}

const metricLabels = [
  ["total", "Total lines"],
  ["pendingClientNumber", "Awaiting client"],
  ["clientNumberReceived", "Ready for MDR"],
  ["converted", "In MDR"],
] as const

export function PdiWorkspace({
  counts,
  canCreate,
  canTransfer,
  createPanel,
  transferPanel,
  children,
}: PdiWorkspaceProps) {
  return (
    <div className="flex flex-1 flex-col gap-3 px-3 py-3 md:px-5 md:py-4">
      <section className="border-line bg-panel overflow-hidden rounded-[12px] border">
        <div className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
          <div className="min-w-0">
            <div className="text-accent-txt flex items-center gap-2 font-mono text-[9px] tracking-[0.1em] uppercase">
              <ListChecksIcon className="size-3.5" aria-hidden="true" />
              PDI register
            </div>
            <h1 className="mt-2 text-[22px] font-medium tracking-[-0.03em] md:text-[26px]">
              Project document index
            </h1>
            <p className="text-soft mt-1 max-w-2xl text-[11px] leading-5">
              Register documents, collect client numbers, and promote completed
              lines into the MDR.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {canTransfer ? (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FileSpreadsheetIcon
                      className="size-3.5"
                      aria-hidden="true"
                    />
                    Import / export
                  </Button>
                </SheetTrigger>
                <SheetContent
                  className="w-full gap-0 overflow-y-auto sm:max-w-lg"
                  side="right"
                >
                  <SheetHeader className="border-line border-b pr-12">
                    <SheetTitle>Import or export PDI data</SheetTitle>
                    <SheetDescription>
                      Exchange a project workbook without crowding the register.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="p-4">{transferPanel}</div>
                </SheetContent>
              </Sheet>
            ) : null}

            {canCreate ? (
              <Sheet>
                <SheetTrigger asChild>
                  <Button className="gap-2">
                    <FilePlus2Icon className="size-3.5" aria-hidden="true" />
                    New PDI item
                  </Button>
                </SheetTrigger>
                <SheetContent
                  className="!w-full gap-0 overflow-y-auto sm:!max-w-[560px]"
                  side="right"
                >
                  <SheetHeader className="border-line border-b pr-12">
                    <SheetTitle>Create a PDI item</SheetTitle>
                    <SheetDescription>
                      The internal document number is generated automatically.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="p-4">{createPanel}</div>
                </SheetContent>
              </Sheet>
            ) : null}
          </div>
        </div>

        <div className="border-line grid grid-cols-2 border-t md:grid-cols-4">
          {metricLabels.map(([key, label], index) => (
            <div
              key={key}
              className={
                index === 0 ? "px-4 py-3" : "border-line border-l px-4 py-3"
              }
            >
              <span className="font-mono text-[20px] font-semibold tracking-[-0.04em]">
                {counts[key]}
              </span>
              <span className="text-dim ml-2 text-[9.5px]">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {children}
    </div>
  )
}
