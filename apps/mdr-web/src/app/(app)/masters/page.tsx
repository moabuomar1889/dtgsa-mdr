import {
  createDisciplineAction,
  createDocumentTypeAction,
  createReleasePurposeAction,
  createReviewCodeAction,
} from "@/server/actions/platform-admin"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { requireUserHasAnyPermission } from "@/server/services/auth/page-access-service"
import { getGlobalMasterData } from "@/server/services/masters/master-data-service"
import { ReviewCodeForm } from "@/components/app/review-code-form"
import { SubmitButton } from "@/components/app/submit-button"
import { Badge } from "@/components/dtg/badge"
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
    <Card className="border-line bg-panel">
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

function renderNumberingRulePreview(
  tokens: Array<{ key: string; order: number }>
) {
  return tokens
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((token) => `{${token.key}}`)
    .join(" ")
}

export default async function MastersPage() {
  const user = await requireCurrentAppUser()
  requireUserHasAnyPermission(user, PERMISSIONS.mastersManage)

  const masters = await getGlobalMasterData()

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-line bg-panel">
          <CardHeader className="border-line bg-head gap-2 border-b">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-accent-bg text-accent-txt hover:bg-accent-bg rounded-[4px] px-1.5 py-0.5">
                Master Data
              </Badge>
              <Badge variant="outline">Config driven</Badge>
            </div>
            <CardTitle className="text-[22px] font-medium tracking-[-0.02em]">
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
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Disciplines</p>
              <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                {masters.disciplines.length}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Document types</p>
              <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                {masters.documentTypes.length}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Release purposes</p>
              <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                {masters.releasePurposes.length}
              </p>
            </div>
            <div className="border-line bg-raise rounded-[9px] border p-4">
              <p className="text-soft text-sm">Review codes</p>
              <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
                {masters.reviewCodes.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-line bg-panel">
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
                className="border-line bg-raise rounded-[9px] border p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{rule.name}</p>
                  <Badge variant={rule.isDefault ? "default" : "outline"}>
                    {rule.sequenceScope}
                  </Badge>
                </div>
                <p className="text-soft mt-2 text-sm">{rule.formatString}</p>
                <p className="text-soft mt-1 font-mono text-xs">
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
        <Card className="border-line bg-panel">
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
        <Card className="border-line bg-panel">
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
                    <TableCell className="font-medium">
                      {discipline.code}
                    </TableCell>
                    <TableCell>{discipline.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={discipline.isActive ? "default" : "outline"}
                      >
                        {discipline.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-line bg-panel">
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

        <Card className="border-line bg-panel">
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

        <Card className="border-line bg-panel">
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
                    <TableCell className="text-soft">
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
