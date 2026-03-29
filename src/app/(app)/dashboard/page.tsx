import {
  ArrowRightIcon,
  CheckCircle2Icon,
  Clock3Icon,
  KeyRoundIcon,
} from "lucide-react"
import {
  dashboardMetrics,
  environmentInputs,
  phaseProgress,
  statusDimensions,
} from "@/features/dashboard/data/dashboard-overview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="space-y-4 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
                Enterprise Platform Bootstrap
              </Badge>
              <Badge variant="outline" className="rounded-full">
                Phase 0
              </Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">
                DTGSA document control foundation is now running on the locked
                stack and structured for phased delivery.
              </CardTitle>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                The current baseline wires the Next.js shell, shadcn dashboard
                layout, environment contract, Prisma foundation, and the core
                module structure that Phase 1 will build on.
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            {dashboardMetrics.map((metric) => (
              <div
                key={metric.title}
                className="rounded-2xl border border-border/70 bg-background/80 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <metric.icon className="size-5" />
                  </div>
                  <ArrowRightIcon className="size-4 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{metric.title}</p>
                  <p className="text-xl font-semibold tracking-tight">
                    {metric.value}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {metric.detail}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Environment Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {environmentInputs.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/80 p-3"
              >
                <KeyRoundIcon className="mt-0.5 size-4 text-primary" />
                <p className="text-sm leading-6 text-muted-foreground">{item}</p>
              </div>
            ))}
            <Button className="mt-2 w-full justify-between" variant="outline">
              Awaiting secure environment values
              <Clock3Icon className="size-4" />
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Delivery Roadmap</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phase</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phaseProgress.map((phase) => (
                  <TableRow key={phase.phase}>
                    <TableCell className="font-medium">{phase.phase}</TableCell>
                    <TableCell>
                      <Badge
                        variant={phase.status === "Active" ? "default" : "outline"}
                      >
                        {phase.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {phase.summary}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Status Model Guardrails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusDimensions.map((item) => (
              <div
                key={item.dimension}
                className="rounded-2xl border border-border/60 bg-background/80 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 text-primary" />
                  <h3 className="font-medium">{item.dimension}</h3>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.rule}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
