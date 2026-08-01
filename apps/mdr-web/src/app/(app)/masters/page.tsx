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
import { RegisterWorkspace } from "@/components/app/register-workspace"
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
    <RegisterWorkspace
      eyebrow="Platform configuration"
      title="Masters"
      description="Maintain the shared coding tables used by projects, documents, numbering, and client workflows."
      metrics={[
        { label: "Disciplines", value: masters.disciplines.length },
        { label: "Document types", value: masters.documentTypes.length },
        { label: "Release purposes", value: masters.releasePurposes.length },
        { label: "Review codes", value: masters.reviewCodes.length },
      ]}
      actions={[
        {
          label: "Add master data",
          title: "Add a master record",
          description:
            "Choose the record type below. Existing registers remain visible behind this panel.",
          intent: "create",
          width: "xl",
          panel: (
            <div className="grid gap-4">
              <SimpleMasterForm
                title="Discipline"
                description="Create a system-level discipline."
                codePlaceholder="HSE"
                namePlaceholder="Health, Safety & Environment"
                action={createDisciplineAction}
              />
              <SimpleMasterForm
                title="Document Type"
                description="Define a document type used by PDI and MDR."
                codePlaceholder="ITP"
                namePlaceholder="Inspection & Test Plan"
                action={createDocumentTypeAction}
              />
              <SimpleMasterForm
                title="Release Purpose"
                description="Define a release-purpose code for covers and transmittals."
                codePlaceholder="IFR"
                namePlaceholder="Issued for Review"
                action={createReleasePurposeAction}
              />
              <Card className="border-line bg-panel">
                <CardHeader>
                  <CardTitle className="text-lg">Review code</CardTitle>
                  <CardDescription>
                    Add a global default review code.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ReviewCodeForm action={createReviewCodeAction} />
                </CardContent>
              </Card>
            </div>
          ),
        },
      ]}
    >
      <section className="grid gap-4">
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
    </RegisterWorkspace>
  )
}
