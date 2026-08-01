import type { LucideIcon } from "lucide-react"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  Clock3Icon,
  SendIcon,
} from "lucide-react"
import type { CommandWorkspaceOverview } from "@/features/dashboard/types"

type AttentionItem = {
  label: string
  detail: string
  value: number
  icon: LucideIcon
  tone: string
}

export function AttentionSummary({
  attention,
}: {
  attention: CommandWorkspaceOverview["attention"]
}) {
  const items: AttentionItem[] = [
    {
      label: "High attention",
      detail: "returned actions",
      value: attention.highPriority,
      icon: AlertTriangleIcon,
      tone: "text-bad",
    },
    {
      label: "Ready now",
      detail: "actions available",
      value: attention.readyNow,
      icon: CheckCircle2Icon,
      tone: "text-ok",
    },
    {
      label: "In decision",
      detail: "review, approval, DC",
      value: attention.decisions,
      icon: Clock3Icon,
      tone: "text-warn",
    },
    {
      label: "Awaiting client",
      detail: "documents waiting",
      value: attention.awaitingClient,
      icon: SendIcon,
      tone: "text-accent-txt",
    },
  ]

  return (
    <section className="border-line bg-panel grid grid-cols-2 overflow-hidden rounded-[10px] border lg:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`flex items-center gap-3 px-3 py-3 ${
            index > 0 ? "border-line border-l" : ""
          } ${index === 2 ? "max-lg:border-t max-lg:border-l-0" : ""} ${
            index === 3 ? "max-lg:border-t" : ""
          }`}
        >
          <item.icon
            className={`size-4 shrink-0 ${item.tone}`}
            aria-hidden="true"
          />
          <span className="font-mono text-[20px] font-semibold">
            {item.value}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[10.5px] font-medium">
              {item.label}
            </span>
            <span className="text-dim block truncate text-[9px]">
              {item.detail}
            </span>
          </span>
        </div>
      ))}
    </section>
  )
}
