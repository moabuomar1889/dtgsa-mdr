import { Badge } from "@/components/dtg/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dtg/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/dtg/table"
import type { PdiImportReport } from "@/server/services/pdi/pdi-import-report"

const outcomeLabel: Record<string, string> = {
  Added: "Added",
  ClientNumberAssigned: "Client number added",
  Unchanged: "Already present",
  Conflict: "Conflict",
  Error: "Error",
}

const outcomeTone: Record<string, "default" | "outline" | "destructive"> = {
  Added: "default",
  ClientNumberAssigned: "default",
  Unchanged: "outline",
  Conflict: "destructive",
  Error: "destructive",
}

export function PdiImportReport({ report }: { report: PdiImportReport }) {
  const needsAttention = report.conflictCount + report.errorCount

  return (
    <Card className="border-line bg-panel">
      <CardHeader className="border-line bg-head gap-2 border-b">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-accent-bg text-accent-txt hover:bg-accent-bg rounded-[4px] px-1.5 py-0.5">
            Import report
          </Badge>
          <Badge variant={needsAttention > 0 ? "destructive" : "outline"}>
            {needsAttention > 0
              ? `${needsAttention} need attention`
              : "No conflicts"}
          </Badge>
        </div>
        <CardTitle className="text-[22px] font-medium tracking-[-0.02em]">
          Reconciliation of {report.fileName}
        </CardTitle>
        <CardDescription className="max-w-3xl leading-6">
          Rows were matched to the register on the internal document number and
          the title. Internal and client numbers are never changed by an import.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4 pt-4 sm:grid-cols-5">
        {[
          { label: "Rows read", value: report.rowCount },
          { label: "Added", value: report.addedCount },
          { label: "Client numbers added", value: report.numberedCount },
          { label: "Already present", value: report.unchangedCount },
          {
            label: "Conflicts / errors",
            value: report.conflictCount + report.errorCount,
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="border-line bg-raise rounded-[9px] border p-4"
          >
            <p className="text-soft text-sm">{metric.label}</p>
            <p className="mt-2 font-mono text-[24px] font-semibold tracking-[-0.03em]">
              {metric.value}
            </p>
          </div>
        ))}
      </CardContent>

      <CardContent>
        {report.results.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Internal number</TableHead>
                <TableHead>Client number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.results.map((result) => (
                <TableRow key={result.id}>
                  <TableCell className="font-mono text-[10.5px]">
                    {result.rowNumber}
                  </TableCell>
                  <TableCell>
                    <Badge variant={outcomeTone[result.outcome] ?? "outline"}>
                      {outcomeLabel[result.outcome] ?? result.outcome}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-accent-txt font-mono text-[10.5px]">
                    {result.dtgsaDocumentNumber ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-[10.5px]">
                    {result.clientDocumentNumber ?? "—"}
                  </TableCell>
                  <TableCell>{result.title ?? "—"}</TableCell>
                  <TableCell className="text-soft text-[11px] leading-5">
                    {result.detail ?? ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="border-line bg-raise text-soft rounded-[9px] border border-dashed p-6 text-sm leading-6">
            The workbook contained no rows with a title, so nothing was
            reconciled.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
