import Link from "next/link"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { searchPlatform } from "@/server/services/search/global-search-service"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export const dynamic = "force-dynamic"

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string
  }>
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
      {query.length >= 2
        ? `No results matched "${query}". Try a project code, document number, transmittal number, or part of a document title.`
        : "Search becomes active once at least two characters are entered."}
    </div>
  )
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const user = await requireCurrentAppUser()
  const results = await searchPlatform(user, resolvedSearchParams.q)
  const hasResults =
    results.counts.projects +
      results.counts.pdiItems +
      results.counts.mdrDocuments +
      results.counts.transmittals +
      results.counts.clientReplies >
    0

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
              Global Search
            </Badge>
            <Badge variant="outline">Projects, documents, replies, transmittals</Badge>
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Search now spans the live project, PDI, MDR, transmittal, and client-reply records.
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            Use project codes, DTGSA numbers, client numbers, titles, or transmittal references to jump across the operating dataset.
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
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Search
            </button>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-5">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Projects</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{results.counts.projects}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">PDI</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{results.counts.pdiItems}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">MDR</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{results.counts.mdrDocuments}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Transmittals</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{results.counts.transmittals}</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Replies</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{results.counts.clientReplies}</p>
          </CardContent>
        </Card>
      </section>

      {hasResults ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.projects.length > 0 ? (
                results.projects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-2xl border border-border/60 bg-background/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {project.code} - {project.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {project.client.code} - {project.client.name}
                        </p>
                      </div>
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
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

          <Card className="border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">PDI + MDR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...results.pdiItems, ...results.mdrDocuments].length > 0 ? (
                <>
                  {results.pdiItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-border/60 bg-background/80 p-4"
                    >
                      <p className="font-medium">{item.dtgsaDocumentNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        PDI / {item.project.code} / {item.discipline.code} / {item.title}
                      </p>
                    </div>
                  ))}
                  {results.mdrDocuments.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-border/60 bg-background/80 p-4"
                    >
                      <p className="font-medium">{item.dtgsaDocumentNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        MDR / {item.project.code} / {item.discipline.code} / Rev{" "}
                        {item.currentRevision?.revisionLabel ?? "N/A"} / {item.title}
                      </p>
                    </div>
                  ))}
                </>
              ) : (
                <EmptyState query={results.search} />
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Transmittals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.transmittals.length > 0 ? (
                results.transmittals.map((transmittal) => (
                  <div
                    key={transmittal.id}
                    className="rounded-2xl border border-border/60 bg-background/80 p-4"
                  >
                    <p className="font-medium">{transmittal.transmittalNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {transmittal.project.code} / {transmittal.subject} / {transmittal._count.items} items
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState query={results.search} />
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Client replies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.clientReplies.length > 0 ? (
                results.clientReplies.map((reply) => (
                  <div
                    key={reply.id}
                    className="rounded-2xl border border-border/60 bg-background/80 p-4"
                  >
                    <p className="font-medium">
                      {reply.document.dtgsaDocumentNumber} / {reply.reviewCode.code}
                    </p>
                    <p className="text-sm text-muted-foreground">
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
