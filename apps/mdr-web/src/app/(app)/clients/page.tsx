import Link from "next/link"
import { createClientAction } from "@/server/actions/platform-admin"
import { listClients } from "@/server/services/clients/client-management"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/dtg/badge"
import { Button } from "@/components/dtg/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dtg/card"
import { Input } from "@/components/dtg/input"
import { Label } from "@/components/dtg/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/dtg/table"
import { Textarea } from "@/components/dtg/textarea"

export const dynamic = "force-dynamic"

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

export default async function ClientsPage() {
  const clients = await listClients()
  const activeClients = clients.filter((client) => client.isActive).length
  const totalProjects = clients.reduce(
    (sum, client) => sum + client._count.projects,
    0
  )

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
                Client Management
              </Badge>
              <Badge variant="outline">Phase 1</Badge>
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Client profiles define the inheritance starting point for projects,
              numbering, review codes, templates, and contacts.
            </CardTitle>
            <CardDescription className="max-w-3xl leading-6">
              This screen is now wired to the real database. Each client created
              here becomes available immediately in project onboarding and can
              later receive client-scoped settings, review codes, numbering
              rules, cover templates, and contacts.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Total clients</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {formatCount(clients.length)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Active clients</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {formatCount(activeClients)}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Linked projects</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {formatCount(totalProjects)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Create client</CardTitle>
            <CardDescription>
              Add the client once, then reuse it across project onboarding,
              review codes, numbering logic, templates, and portal access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createClientAction} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="client-code">Client code</Label>
                  <Input
                    id="client-code"
                    name="code"
                    placeholder="RAMCO"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="client-timezone">Default timezone</Label>
                  <Input
                    id="client-timezone"
                    name="defaultTimezone"
                    defaultValue="Asia/Riyadh"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="client-name">Client name</Label>
                <Input
                  id="client-name"
                  name="name"
                  placeholder="Air Products"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="client-description">Description</Label>
                <Textarea
                  id="client-description"
                  name="description"
                  placeholder="Optional notes about numbering rules, workflows, or template requirements."
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <SubmitButton
                  label="Create client"
                  pendingLabel="Creating client"
                />
                <Button asChild variant="outline">
                  <Link href="/projects/new">Open project onboarding</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Client register</CardTitle>
          <CardDescription>
            These are the client records currently stored in the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Contacts</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {client.code} - {client.name}
                        </span>
                        {client.description ? (
                          <span className="text-xs text-muted-foreground">
                            {client.description}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{client.defaultTimezone}</TableCell>
                    <TableCell>{client._count.projects}</TableCell>
                    <TableCell>{client._count.contacts}</TableCell>
                    <TableCell>
                      <Badge variant={client.isActive ? "default" : "outline"}>
                        {client.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
              No clients have been created yet. Start by adding the first client,
              then move to project onboarding.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
