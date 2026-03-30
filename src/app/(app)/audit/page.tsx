import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { getAuditOverview } from "@/server/services/audit/audit-overview"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const dynamic = "force-dynamic"

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

function renderJson(value: unknown) {
  return value ? JSON.stringify(value) : "—"
}

export default async function AuditPage() {
  const user = await requireCurrentAppUser()
  const overview = await getAuditOverview(user)

  if (!overview.allowed) {
    return (
      <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Audit access</CardTitle>
            <CardDescription>
              Your current role set does not include audit-log visibility.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
              Audit & System Logs
            </Badge>
            <Badge variant="outline">Read-only traceability</Badge>
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Business actions and technical log entries are now visible in the
            workspace.
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            This screen surfaces the audit trail already being written by the
            admin, PDI, MDR, and workflow services. Technical system log writing
            will expand as integrations and background jobs are added.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="business" className="grid gap-4">
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="business">Business audit</TabsTrigger>
          <TabsTrigger value="system">System log</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card className="border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Business audit log</CardTitle>
              <CardDescription>
                The latest business actions captured by the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview.auditLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Context</TableHead>
                      <TableHead>Snapshot</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{log.action}</span>
                            <Badge variant="outline">{log.severity}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.entityType} / {log.entityId}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.actorUser?.fullName ?? "System"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.project ? `${log.project.code} / ` : ""}
                          {log.client ? `${log.client.code}` : "—"}
                        </TableCell>
                        <TableCell className="max-w-80 font-mono text-xs text-muted-foreground">
                          {renderJson(log.afterSnapshot)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
                  No business audit entries have been recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card className="border-border/70 bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Technical system log</CardTitle>
              <CardDescription>
                Integration and system events captured by the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview.systemLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Metadata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.systemLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell>{log.source}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{log.action}</span>
                            <span className="text-sm text-muted-foreground">
                              {log.message}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.severity}</Badge>
                        </TableCell>
                        <TableCell className="max-w-80 font-mono text-xs text-muted-foreground">
                          {renderJson(log.metadata)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 p-6 text-sm leading-6 text-muted-foreground">
                  No technical system log entries have been recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
