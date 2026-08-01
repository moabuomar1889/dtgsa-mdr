import Link from "next/link"
import { PdiStatus } from "@prisma/client"
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  Clock3Icon,
  FileTextIcon,
  SendIcon,
} from "lucide-react"
import type { getPdiOverview } from "@/server/services/pdi/pdi-service"
import {
  markPdiItemSentToClientAction,
  promotePdiItemToMdrAction,
  updatePdiClientDocumentNumberAction,
} from "@/server/actions/pdi"
import { RegisterPagination } from "@/components/app/register-pagination"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/dtg/badge"
import { Button } from "@/components/dtg/button"
import { Input } from "@/components/dtg/input"

type PdiOverview = Awaited<ReturnType<typeof getPdiOverview>>
type PdiItem = PdiOverview["items"][number]

const statusPresentation: Record<PdiStatus, { label: string; detail: string }> =
  {
    [PdiStatus.Draft]: {
      label: "Draft",
      detail: "Ready to send",
    },
    [PdiStatus.SentToClient]: {
      label: "With client",
      detail: "Waiting for number",
    },
    [PdiStatus.ClientNumberPending]: {
      label: "With client",
      detail: "Waiting for number",
    },
    [PdiStatus.ClientNumberReceived]: {
      label: "Number received",
      detail: "Ready for MDR",
    },
    [PdiStatus.ConvertedToMdr]: {
      label: "In MDR",
      detail: "Register complete",
    },
    [PdiStatus.Archived]: {
      label: "Archived",
      detail: "No action required",
    },
  }

function PdiRowAction({
  item,
  canManage,
  canCollaborate,
}: {
  item: PdiItem
  canManage: boolean
  canCollaborate: boolean
}) {
  if (item.status === PdiStatus.ConvertedToMdr) {
    const href = item.mdrDocument?.currentRevisionId
      ? `/mdr?revisionId=${encodeURIComponent(item.mdrDocument.currentRevisionId)}#revision-${item.mdrDocument.currentRevisionId}`
      : "/mdr"
    return (
      <Button asChild variant="outline" size="sm" className="w-full">
        <Link href={href}>
          Open in MDR
          <ArrowRightIcon aria-hidden="true" />
        </Link>
      </Button>
    )
  }

  if (item.status === PdiStatus.ClientNumberReceived && canManage) {
    return (
      <form action={promotePdiItemToMdrAction}>
        <input type="hidden" name="pdiItemId" value={item.id} />
        <SubmitButton
          label="Promote to MDR"
          pendingLabel="Promoting"
          size="sm"
          className="w-full"
        />
      </form>
    )
  }

  if (item.status === PdiStatus.Draft && canManage) {
    return (
      <form action={markPdiItemSentToClientAction}>
        <input type="hidden" name="pdiItemId" value={item.id} />
        <SubmitButton
          label="Send to client"
          pendingLabel="Sending"
          size="sm"
          className="w-full"
        />
      </form>
    )
  }

  if (
    (item.status === PdiStatus.SentToClient ||
      item.status === PdiStatus.ClientNumberPending) &&
    (canManage || canCollaborate)
  ) {
    return (
      <form action={updatePdiClientDocumentNumberAction} className="grid gap-2">
        <input type="hidden" name="pdiItemId" value={item.id} />
        <Input
          name="clientDocumentNumber"
          aria-label={`Client number for ${item.dtgsaDocumentNumber}`}
          placeholder="Client document number"
          required
        />
        <SubmitButton
          label="Record number"
          pendingLabel="Saving"
          size="sm"
          className="w-full"
        />
      </form>
    )
  }

  return (
    <p className="text-dim text-[9.5px] leading-4">
      {item.status === PdiStatus.ClientNumberReceived
        ? "Waiting for Document Control promotion."
        : "No action is available for your role."}
    </p>
  )
}

export function PdiRegister({
  overview,
  manageableProjectIds,
  collaborativeProjectIds,
}: {
  overview: PdiOverview
  manageableProjectIds: string[]
  collaborativeProjectIds: string[]
}) {
  const manageable = new Set(manageableProjectIds)
  const collaborative = new Set(collaborativeProjectIds)

  return (
    <section className="border-line bg-panel overflow-hidden rounded-[12px] border">
      <div className="border-line flex items-center justify-between gap-3 border-b px-4 py-3.5">
        <div>
          <h2 className="text-[14px] font-medium">Register lines</h2>
          <p className="text-dim mt-0.5 text-[9.5px]">
            Work from the next action shown on each document.
          </p>
        </div>
        <Badge variant="outline">{overview.pagination.total} documents</Badge>
      </div>

      {overview.items.length > 0 ? (
        <div className="divide-line divide-y">
          {overview.items.map((item) => {
            const status = statusPresentation[item.status]
            const canManage = manageable.has(item.project.id)
            const canCollaborate = collaborative.has(item.project.id)
            const StatusIcon =
              item.status === PdiStatus.ConvertedToMdr
                ? CheckCircle2Icon
                : item.status === PdiStatus.Draft
                  ? FileTextIcon
                  : item.status === PdiStatus.ClientNumberReceived
                    ? SendIcon
                    : Clock3Icon

            return (
              <article
                key={item.id}
                className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_170px_220px] lg:items-center"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="border-line bg-raise text-accent-txt flex size-9 shrink-0 items-center justify-center rounded-[9px] border">
                    <StatusIcon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-medium">
                        {item.dtgsaDocumentNumber}
                      </span>
                      <Badge
                        variant={
                          item.status === PdiStatus.ConvertedToMdr ||
                          item.status === PdiStatus.ClientNumberReceived
                            ? "default"
                            : "outline"
                        }
                      >
                        {status.label}
                      </Badge>
                    </div>
                    <h3 className="mt-1.5 truncate text-[12px] font-medium">
                      {item.title}
                    </h3>
                    <p className="text-soft mt-1 text-[9.5px]">
                      {item.discipline.code} /{" "}
                      {item.documentTypeCategory?.code ?? "-"} /{" "}
                      {item.releasePurpose?.code ?? "-"} / Rev {item.revision}
                    </p>
                    {item.clientDocumentNumber ? (
                      <p className="text-dim mt-1 font-mono text-[9px]">
                        Client: {item.clientDocumentNumber}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="lg:border-line min-w-0 lg:border-l lg:pl-4">
                  <p className="truncate text-[10.5px] font-medium">
                    {item.project.code}
                  </p>
                  <p className="text-dim mt-1 truncate text-[9px]">
                    {item.project.name}
                  </p>
                  <p className="text-soft mt-1 truncate text-[9px]">
                    {item.project.client.name}
                  </p>
                </div>

                <div className="border-line bg-raise rounded-[9px] border p-3">
                  <p className="text-dim mb-2 text-[8.5px] tracking-[0.08em] uppercase">
                    {status.detail}
                  </p>
                  <PdiRowAction
                    item={item}
                    canManage={canManage}
                    canCollaborate={canCollaborate}
                  />
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="px-5 py-12 text-center">
          <FileTextIcon
            className="text-dim mx-auto size-5"
            aria-hidden="true"
          />
          <p className="mt-3 text-[12px] font-medium">No PDI lines yet</p>
          <p className="text-dim mt-1 text-[9.5px]">
            Create the first item to start the register.
          </p>
        </div>
      )}

      <RegisterPagination basePath="/pdi" {...overview.pagination} />
    </section>
  )
}
