import Link from "next/link"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { requireUserHasAnyPermission } from "@/server/services/auth/page-access-service"
import {
  searchPlatform,
  SEARCH_PERMISSIONS,
} from "@/server/services/search/global-search-service"
import { Badge } from "@/components/dtg/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dtg/card"
import { Input } from "@/components/dtg/input"

export const dynamic = "force-dynamic"

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string
  }>
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
      {query.length >= 2
        ? `No results matched "${query}". Try a project code, document number, transmittal number, or part of a document title.`
        : "Search becomes active once at least two characters are entered."}
    </div>
  )
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const user = await requireCurrentAppUser()
  requireUserHasAnyPermission(user, SEARCH_PERMISSIONS)

  const results = await searchPlatform(user, resolvedSearchParams.q)
  const hasResults =
    results.counts.projects +
      results.counts.pdiItems +
      results.counts.mdrDocuments +
      results.counts.transmittals +
      results.counts.clientReplies >
    0

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <Card className="border-line bg-panel">
        <CardHeader className="border-line bg-head gap-2 border-b">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-accent-bg text-accent-txt hover:bg-accent-bg rounded-[4px] px-1.5 py-0.5">
              Global Search
            </Badge>
            <Badge variant="outline">
              Projects, documents, replies, transmittals
            </Badge>
          </div>
          <CardTitle className="text-[22px] font-medium tracking-[-0.02em]">
            Search now spans the live project, PDI, MDR, transmittal, and
            client-reply records.
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            Use project codes, DTGSA numbers, client numbers, titles, or
            transmittal references to jump across the operating dataset.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              name="q"
              defaultValue={results.search}
              placeholder="Search PRJ-010, document numbers, titles, replies, or transmittals"
            />
            <button
              type="submit"
              className="text-on-accent inline-flex h-10 items-center justify-center rounded-[7px] bg-[var(--accent)] px-4 text-sm font-medium"
            >
              Search
            </button>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-5">
        <Card className="border-line bg-panel">
          <CardContent className="p-4">
            <p className="text-soft text-sm">Projects</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
              {results.counts.projects}
            </p>
          </CardContent>
        </Card>
        <Card className="border-line bg-panel">
          <CardContent className="p-4">
            <p className="text-soft text-sm">PDI</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
              {results.counts.pdiItems}
            </p>
          </CardContent>
        </Card>
        <Card className="border-line bg-panel">
          <CardContent className="p-4">
            <p className="text-soft text-sm">MDR</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
              {results.counts.mdrDocuments}
            </p>
          </CardContent>
        </Card>
        <Card className="border-line bg-panel">
          <CardContent className="p-4">
            <p className="text-soft text-sm">Transmittals</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
              {results.counts.transmittals}
            </p>
          </CardContent>
        </Card>
        <Card className="border-line bg-panel">
          <CardContent className="p-4">
            <p className="text-soft text-sm">Replies</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
              {results.counts.clientReplies}
            </p>
          </CardContent>
        </Card>
      </section>

      {hasResults ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-line bg-panel">
            <CardHeader>
              <CardTitle className="text-lg">Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.projects.length > 0 ? (
                results.projects.map((project) => (
                  <div
                    key={project.id}
                    className="border-line bg-raise rounded-[9px] border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {project.code} - {project.name}
                        </p>
                        <p className="text-soft text-sm">
                          {project.client.code} - {project.client.name}
                        </p>
                      </div>
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-accent-txt text-sm font-medium underline-offset-4 hover:underline"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState query={results.search} />
              )}
            </CardContent>
          </Card>

          <Card className="border-line bg-panel">
            <CardHeader>
              <CardTitle className="text-lg">PDI + MDR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...results.pdiItems, ...results.mdrDocuments].length > 0 ? (
                <>
                  {results.pdiItems.map((item) => (
                    <div
                      key={item.id}
                      className="border-line bg-raise rounded-[9px] border p-4"
                    >
                      <p className="font-medium">{item.dtgsaDocumentNumber}</p>
                      <p className="text-soft text-sm">
                        PDI / {item.project.code} / {item.discipline.code} /{" "}
                        {item.title}
                      </p>
                    </div>
                  ))}
                  {results.mdrDocuments.map((item) => (
                    <div
                      key={item.id}
                      className="border-line bg-raise rounded-[9px] border p-4"
                    >
                      <p className="font-medium">{item.dtgsaDocumentNumber}</p>
                      <p className="text-soft text-sm">
                        MDR / {item.project.code} / {item.discipline.code} / Rev{" "}
                        {item.currentRevision?.revisionLabel ?? "N/A"} /{" "}
                        {item.title}
                      </p>
                    </div>
                  ))}
                </>
              ) : (
                <EmptyState query={results.search} />
              )}
            </CardContent>
          </Card>

          <Card className="border-line bg-panel">
            <CardHeader>
              <CardTitle className="text-lg">Transmittals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.transmittals.length > 0 ? (
                results.transmittals.map((transmittal) => (
                  <div
                    key={transmittal.id}
                    className="border-line bg-raise rounded-[9px] border p-4"
                  >
                    <p className="font-medium">
                      {transmittal.transmittalNumber}
                    </p>
                    <p className="text-soft text-sm">
                      {transmittal.project.code} / {transmittal.subject} /{" "}
                      {transmittal._count.items} items
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState query={results.search} />
              )}
            </CardContent>
          </Card>

          <Card className="border-line bg-panel">
            <CardHeader>
              <CardTitle className="text-lg">Client replies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.clientReplies.length > 0 ? (
                results.clientReplies.map((reply) => (
                  <div
                    key={reply.id}
                    className="border-line bg-raise rounded-[9px] border p-4"
                  >
                    <p className="font-medium">
                      {reply.document.dtgsaDocumentNumber} /{" "}
                      {reply.reviewCode.code}
                    </p>
                    <p className="text-soft text-sm">
                      {reply.project.code} / {reply.document.title}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState query={results.search} />
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState query={results.search} />
      )}
    </div>
  )
}
