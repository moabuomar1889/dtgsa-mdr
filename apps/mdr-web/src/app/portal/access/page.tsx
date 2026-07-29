import { Card, CardContent, CardHeader, CardTitle } from "@/components/dtg/card"

type PortalAccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function PortalAccessPage({
  searchParams,
}: PortalAccessPageProps) {
  const error = (await searchParams)?.error
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>DTG client portal access</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-4 text-sm leading-6">
          <p>
            Open the secure invitation sent by DTG Document Control. Internal
            employee sessions cannot be used on this portal.
          </p>
          {typeof error === "string" ? (
            <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3">
              {decodeURIComponent(error)}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
