import { createHmac, timingSafeEqual } from "node:crypto"
import { createServer } from "node:http"
import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

const host = "127.0.0.1"
const port = Number(process.env.LOCAL_EMAIL_PORT || 4101)
const runtimeRoot = process.env.LOCAL_RUNTIME_ROOT
const secret = process.env.LOCAL_WEBHOOK_SECRET
if (process.env.LOCAL_ACCEPTANCE_MODE !== "true" || !runtimeRoot || !secret) {
  throw new Error("Local support service requires guarded runtime settings.")
}

const emailPath = join(runtimeRoot, "email", "messages.json")
const webhookPath = join(runtimeRoot, "webhooks", "deliveries.json")
await mkdir(join(runtimeRoot, "webhooks"), { recursive: true })

async function json(path, fallback = []) {
  if (!existsSync(path)) return fallback
  return JSON.parse(await readFile(path, "utf8"))
}

function send(response, status, body, contentType = "application/json") {
  response.writeHead(status, {
    "content-type": `${contentType}; charset=utf-8`,
    "cache-control": "no-store",
    "content-security-policy":
      "default-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
  })
  response.end(contentType === "application/json" ? JSON.stringify(body) : body)
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`)
  if (request.method === "GET" && url.pathname === "/health") {
    send(response, 200, { status: "ok", provider: "SIMULATED_PROVIDER" })
    return
  }
  if (request.method === "GET" && url.pathname === "/api/messages") {
    send(response, 200, { messages: await json(emailPath) })
    return
  }
  if (request.method === "GET" && url.pathname === "/") {
    const messages = await json(emailPath)
    const cards = messages
      .slice()
      .reverse()
      .map(
        (message) =>
          `<article><small>${message.createdAt} / ${message.correlationId}</small><h2>${message.subject}</h2><p>${message.to}</p><pre>${message.text}</pre></article>`
      )
      .join("")
    send(
      response,
      200,
      `<!doctype html><html><head><title>DTG Local Email</title><style>body{font:15px Georgia;background:#f2efe7;color:#17332d;max-width:960px;margin:40px auto;padding:0 20px}h1{font-size:42px}article{background:#fffdf7;border:1px solid #ccd5cf;border-radius:24px;padding:22px;margin:16px 0}small{font-family:monospace;color:#64736d}pre{white-space:pre-wrap}</style></head><body><h1>Local email sink</h1><p>No message leaves this computer.</p>${cards || "<p>No messages yet.</p>"}</body></html>`,
      "text/html"
    )
    return
  }
  if (request.method === "POST" && url.pathname === "/webhooks") {
    const chunks = []
    for await (const chunk of request) chunks.push(Buffer.from(chunk))
    const body = Buffer.concat(chunks).toString("utf8")
    const eventId = String(request.headers["dtg-webhook-id"] || "")
    const timestamp = String(request.headers["dtg-webhook-timestamp"] || "")
    const signature = String(request.headers["dtg-webhook-signature"] || "")
    const deliveries = await json(webhookPath)
    if (deliveries.some((delivery) => delivery.eventId === eventId)) {
      send(response, 409, { error: "replay_rejected" })
      return
    }
    const age = Math.abs(Date.now() - new Date(timestamp).getTime())
    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${body}`)
      .digest("hex")
    const expectedBytes = Buffer.from(expected)
    const providedBytes = Buffer.from(signature)
    if (
      !eventId ||
      !Number.isFinite(age) ||
      age > 300000 ||
      expectedBytes.length !== providedBytes.length ||
      !timingSafeEqual(expectedBytes, providedBytes)
    ) {
      send(response, 401, { error: "signature_invalid" })
      return
    }
    deliveries.push({
      eventId,
      timestamp,
      correlationId: request.headers["x-request-id"] || null,
      receivedAt: new Date().toISOString(),
      body: JSON.parse(body),
    })
    await writeFile(webhookPath, JSON.stringify(deliveries, null, 2))
    send(response, 202, { accepted: true })
    return
  }
  send(response, 404, { error: "not_found" })
})

server.listen(port, host, () => {
  console.log(`Local support service listening on http://${host}:${port}`)
})
