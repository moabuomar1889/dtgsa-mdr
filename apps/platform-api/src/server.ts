import { randomUUID } from "node:crypto"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { loadFoundationConfiguration } from "@dtg/configuration"
import {
  createHealthResponse,
  createReadinessResponse,
} from "@dtg/contracts"
import { writeLog } from "@dtg/observability"

export const apiConfiguration = loadFoundationConfiguration(
  "platform-api",
  process.env,
  3003
)

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
  correlationId: string
) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "x-request-id": correlationId,
  })
  response.end(JSON.stringify(body))
}

export function handleRequest(
  request: IncomingMessage,
  response: ServerResponse
) {
  const correlationId =
    request.headers["x-request-id"]?.toString() || randomUUID()
  const path = new URL(request.url || "/", "http://localhost").pathname

  writeLog({
    level: "info",
    event: "http.request",
    application: apiConfiguration.application,
    correlationId,
    details: { method: request.method, path },
  })

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "method_not_allowed" }, correlationId)
    return
  }

  if (path === "/health") {
    sendJson(
      response,
      200,
      createHealthResponse(apiConfiguration.application),
      correlationId
    )
    return
  }

  if (path === "/ready") {
    sendJson(
      response,
      200,
      createReadinessResponse(apiConfiguration.application),
      correlationId
    )
    return
  }

  if (path === "/version") {
    sendJson(response, 200, apiConfiguration.build, correlationId)
    return
  }

  sendJson(response, 404, { error: "not_found" }, correlationId)
}

export function createPlatformApiServer() {
  return createServer(handleRequest)
}
