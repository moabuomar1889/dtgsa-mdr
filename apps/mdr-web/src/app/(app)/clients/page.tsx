import Link from "next/link"
import { createClientAction } from "@/server/actions/platform-admin"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { requireUserHasAnyPermission } from "@/server/services/auth/page-access-service"
import { listClients } from "@/server/services/clients/client-management"
import { SubmitButton } from "@/components/app/submit-button"
import { RegisterPanel } from "@/components/app/register-panel"
import { RegisterWorkspace } from "@/components/app/register-workspace"
import { Badge } from "@/components/dtg/badge"
import { Button } from "@/components/dtg/button"
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
  const user = await requireCurrentAppUser()
  requireUserHasAnyPermission(user, PERMISSIONS.clientsManage)

  const clients = await listClients()
  const activeClients = clients.filter((client) => client.isActive).length
  const totalProjects = clients.reduce(
    (sum, client) => sum + client._count.projects,
    0
  )

  return (
    <RegisterWorkspace
      eyebrow="Client register"
      title="Clients"
      description="Choose a client to manage preferences, logo, projects, contacts, and browser-editable cover sheets."
      metrics={[
        { label: "Total clients", value: formatCount(clients.length) },
        { label: "Active", value: formatCount(activeClients) },
        { label: "Projects", value: formatCount(totalProjects) },
      ]}
      actions={[
        {
          label: "New client",
          title: "Create a client",
          description:
            "Add the client once, then manage its preferences and cover sheets from the client workspace.",
          intent: "create",
          panel: (
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
          ),
        },
      ]}
    >
      <RegisterPanel
        title="Client register"
        description="Open a client workspace to change preferences or manage its cover sheets."
      >
        {clients.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Cover sheets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Workspace</TableHead>
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
                        <span className="text-soft text-xs">
                          {client.description}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{client.defaultTimezone}</TableCell>
                  <TableCell>{client._count.projects}</TableCell>
                  <TableCell>{client._count.coverSheetTemplates}</TableCell>
                  <TableCell>
                    <Badge variant={client.isActive ? "default" : "outline"}>
                      {client.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/clients/${client.id}`}>Open client</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
            No clients have been created yet. Start by adding the first client,
            then move to project onboarding.
          </div>
        )}
      </RegisterPanel>
    </RegisterWorkspace>
  )
}
