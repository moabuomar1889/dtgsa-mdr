import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { getInternalVerification } from "@/server/services/verification/internal-verification-service"
import { Badge } from "@/components/dtg/badge"
import { Button } from "@/components/dtg/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/dtg/card"
import { Input } from "@/components/dtg/input"

export const dynamic = "force-dynamic"

export default async function InternalVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const actor = await requireCurrentAppUser()
  const query = await searchParams
  const evidence = query.code
    ? await getInternalVerification(actor, query.code)
    : null

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-5 md:px-6">
      <Card>
        <CardHeader>
          <Badge className="w-fit">Internal verification</Badge>
          <CardTitle className="text-3xl">
            Inspect the complete scoped evidence chain.
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex gap-3">
            <Input name="code" required placeholder="Verification code" />
            <Button type="submit">Inspect</Button>
          </form>
        </CardContent>
      </Card>
      {query.code && !evidence ? (
        <Card>
          <CardContent className="pt-6">
            No verification evidence is available for this code.
          </CardContent>
        </Card>
      ) : null}
      {evidence ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {evidence.manifest.revision.document.dtgsaDocumentNumber} / Rev{" "}
                {evidence.manifest.revision.revisionLabel}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <p>
                Client:{" "}
                {evidence.manifest.revision.document.project.client.name}
              </p>
              <p>Project: {evidence.manifest.revision.document.project.name}</p>
              <p>Manifest: {evidence.manifest.id}</p>
              <p>
                Hashes:{" "}
                {evidence.manifest.hashes.map((hash) => hash.value).join(", ")}
              </p>
              <p>Target: {evidence.code.targetType}</p>
              <p>Revoked: {evidence.code.revokedAt ? "Yes" : "No"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Seal and key evidence</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {evidence.seals.map((seal) => (
                <div key={seal.id} className="rounded-xl border p-3">
                  {seal.algorithm} / {seal.keyId} / {seal.verificationStatus} /
                  payload {seal.signedPayloadVersion}
                </div>
              ))}
              <p>This is an application seal, not a PAdES claim.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Approval and review evidence</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <p>Cycles: {evidence.cycles.length}</p>
              {evidence.approvals.map((approval) => (
                <div key={approval.id} className="rounded-xl border p-3">
                  {JSON.stringify(approval.identitySnapshot)} /{" "}
                  {JSON.stringify(approval.roleSnapshot)} /{" "}
                  {approval.createdAt.toISOString()}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Files, responses, and audit</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {evidence.files.map((file) => (
                <p key={file.id}>
                  Main: {file.fileObject.fileName} / {file.fileObject.checksum}
                </p>
              ))}
              {evidence.responses.map((response) => (
                <p key={response.id}>
                  Response: {response.externalCodeSnapshot} /{" "}
                  {response.labelSnapshot} / {response.outcomeClass}
                </p>
              ))}
              <p>Scoped audit events: {evidence.audits.length}</p>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  )
}
