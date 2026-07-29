import {
  createDisciplineAction,
  createDocumentTypeAction,
  createReleasePurposeAction,
  createReviewCodeAction,
} from "@/server/actions/platform-admin"
import { getGlobalMasterData } from "@/server/services/masters/master-data-service"
import { ReviewCodeForm } from "@/components/app/review-code-form"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

export const dynamic = "force-dynamic"

type SimpleMasterFormProps = {
  title: string
  description: string
  codePlaceholder: string
  namePlaceholder: string
  action: (formData: FormData) => void | Promise<void>
}

function SimpleMasterForm({
  title,
  description,
  codePlaceholder,
  namePlaceholder,
  action,
}: SimpleMasterFormProps) {
  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-[0.45fr_1fr]">
            <div className="grid gap-2">
              <Label htmlFor={`${title}-code`}>Code</Label>
              <Input
                id={`${title}-code`}
                name="code"
                placeholder={codePlaceholder}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${title}-name`}>Name</Label>
              <Input
                id={`${title}-name`}
                name="name"
                placeholder={namePlaceholder}
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${title}-description`}>Description</Label>
            <Textarea
              id={`${title}-description`}
              name="description"
              placeholder="Optional business description"
            />
          </div>
          <SubmitButton label={`Add ${title.toLowerCase()}`} />
        </form>
      </CardContent>
    </Card>
  )
}

function renderNumberingRulePreview(tokens: Array<{ key: string; order: number }>) {
  return tokens
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((token) => `{${token.key}}`)
    .join(" ")
}

export default async function MastersPage() {
  const masters = await getGlobalMasterData()

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
                Master Data
              </Badge>
              <Badge variant="outline">Config driven</Badge>
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Global coding tables are now backed by real data instead of page
              placeholders.
            </CardTitle>
            <CardDescription className="max-w-3xl leading-6">
              These global masters seed the inheritance chain for clients and
              projects. Later phases will add import flows and scoped overrides,
              but the platform can already create and list the core system-wide
              records from this screen.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Disciplines</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {masters.disciplines.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Document types</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {masters.documentTypes.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Release purposes</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {masters.releasePurposes.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <p className="text-sm text-muted-foreground">Review codes</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {masters.reviewCodes.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Numbering rules</CardTitle>
            <CardDescription>
              The default token-based numbering engine is seeded and ready for
              client or project overrides in the next slices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {masters.numberingRules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-2xl border border-border/60 bg-background/80 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{rule.name}</p>
                  <Badge variant={rule.isDefault ? "default" : "outline"}>
                    {rule.sequenceScope}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {rule.formatString}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {renderNumberingRulePreview(
                    rule.tokens.map((token) => ({
                      key: token.key,
                      order: token.order,
                    }))
                  )}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SimpleMasterForm
          title="Discipline"
          description="Create system-level disciplines that clients and projects can inherit or override."
          codePlaceholder="HSE"
          namePlaceholder="Health, Safety & Environment"
          action={createDisciplineAction}
        />
        <SimpleMasterForm
          title="Document Type"
          description="Define document type categories used by numbering, PDI, MDR, and cover templates."
          codePlaceholder="ITP"
          namePlaceholder="Inspection & Test Plan"
          action={createDocumentTypeAction}
        />
        <SimpleMasterForm
          title="Release Purpose"
          description="Define the release-purpose coding table that feeds cover sheets and transmittals."
          codePlaceholder="IFR"
          namePlaceholder="Issued for Review"
          action={createReleasePurposeAction}
        />
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Review code</CardTitle>
            <CardDescription>
              Add a global default review code. Client-specific overrides will
              layer on top later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReviewCodeForm action={createReviewCodeAction} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Disciplines</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {masters.disciplines.map((discipline) => (
                  <TableRow key={discipline.id}>
                    <TableCell className="font-medium">{discipline.code}</TableCell>
                    <TableCell>{discipline.name}</TableCell>
                    <TableCell>
                      <Badge variant={discipline.isActive ? "default" : "outline"}>
                        {discipline.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Document types</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {masters.documentTypes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Release purposes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {masters.releasePurposes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Review codes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Behavior</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {masters.reviewCodes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.code}</TableCell>
                    <TableCell>{item.label}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.requiresResubmittal
                        ? "Resubmit required"
                        : item.finalizesDocument
                          ? "Finalizes document"
                          : item.informationalOnly
                            ? "Informational only"
                            : "Standard"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
