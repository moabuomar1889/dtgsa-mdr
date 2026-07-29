export type DtgClientConfiguration = {
  baseUrl: string
  token: string
  fetch?: typeof globalThis.fetch
}

export type DtgApiEnvelope<T> = {
  data: T
  correlationId: string
}

export type ApprovalCaseStatus = {
  id: string
  status: string
  isActive: boolean
  sourceSystem: string
  sourceRecordId?: string
  steps: Array<{
    id: string
    stepKey: string
    status: string
    stepOrder: number
  }>
}

export type CreateApprovalCase = {
  revisionId: string
  workflowSnapshotId: string
  contentHash: string
  sourceSystem: string
  sourceEntityType: string
  sourceRecordId: string
  sourceCallback?: string
  sourceMetadata?: Record<string, unknown>
  purpose: string
  classification: string
}

export type GeneralRequestStatus = {
  id: string
  requestNumber: string
  status: string
  purpose: string
  classification: string
}

export class DtgApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly correlationId?: string
  ) {
    super(code)
  }
}

export class DtgSignatureClient {
  private readonly fetcher: typeof globalThis.fetch

  constructor(private readonly config: DtgClientConfiguration) {
    this.fetcher = config.fetch ?? globalThis.fetch
  }

  private async request<T>(path: string, init: RequestInit = {}) {
    const response = await this.fetcher(
      `${this.config.baseUrl.replace(/\/$/, "")}/api/v1${path}`,
      {
        ...init,
        headers: {
          authorization: `Bearer ${this.config.token}`,
          "content-type": "application/json",
          ...init.headers,
        },
      }
    )
    const body = (await response.json()) as
      | DtgApiEnvelope<T>
      | { error: string; correlationId?: string }
    if (!response.ok || !("data" in body)) {
      const failure = body as { error?: string; correlationId?: string }
      throw new DtgApiError(
        response.status,
        failure.error ?? "request_failed",
        failure.correlationId
      )
    }
    return body
  }

  createCase(body: CreateApprovalCase, key: string) {
    return this.request<{ id: string; status: string }>("/approval-cases", {
      method: "POST",
      headers: { "idempotency-key": key },
      body: JSON.stringify(body),
    })
  }

  readStatus(id: string) {
    return this.request<ApprovalCaseStatus>(
      `/approval-cases/${encodeURIComponent(id)}`
    )
  }

  submit(id: string, key: string) {
    return this.request<{ id: string; status: string; submitted: boolean }>(
      `/approval-cases/${encodeURIComponent(id)}/submit`,
      {
        method: "POST",
        headers: { "idempotency-key": key },
        body: "{}",
      }
    )
  }

  comment(id: string, body: unknown, key: string) {
    return this.request<{ id: string; state: string }>(
      `/approval-cases/${encodeURIComponent(id)}/comments`,
      {
        method: "POST",
        headers: { "idempotency-key": key },
        body: JSON.stringify(body),
      }
    )
  }

  download(id: string) {
    return this.request<{
      id: string
      artifactKind: string
      artifactSha256: string
      expiresAt?: string
    }>(`/downloads/${encodeURIComponent(id)}`)
  }

  verify(body: unknown, key: string) {
    return this.request<{
      status: "VALID" | "NOT_VERIFIED"
      targetType?: string
    }>("/verification", {
      method: "POST",
      headers: { "idempotency-key": key },
      body: JSON.stringify(body),
    })
  }

  createGeneralRequest(body: unknown, key: string) {
    return this.request<GeneralRequestStatus>("/general-requests", {
      method: "POST",
      headers: { "idempotency-key": key },
      body: JSON.stringify(body),
    })
  }

  readGeneralRequest(id: string) {
    return this.request<GeneralRequestStatus>(
      `/general-requests/${encodeURIComponent(id)}`
    )
  }

  registerClientResponse(body: unknown, key: string) {
    return this.request<{ id: string; receivedAt: string }>(
      "/client-responses",
      {
        method: "POST",
        headers: { "idempotency-key": key },
        body: JSON.stringify(body),
      }
    )
  }
}

export function statusBadge(status: string) {
  return {
    label: status.replaceAll("_", " "),
    tone: ["Completed", "VALID", "FinalApproved"].includes(status)
      ? "positive"
      : ["Rejected", "Returned", "NOT_VERIFIED"].includes(status)
        ? "critical"
        : "neutral",
  } as const
}

export { verifyWebhook } from "@dtg/integration-domain"
