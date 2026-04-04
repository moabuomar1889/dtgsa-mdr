import "server-only"
import nodemailer from "nodemailer"
import { SystemSeverity } from "@prisma/client"
import { env } from "@/lib/config/env"
import { prisma } from "@/lib/prisma/client"

type SendEmailInput = {
  to: string | string[]
  subject: string
  text: string
  html?: string | null
  projectId?: string | null
  clientId?: string | null
  actorUserId?: string | null
}

function normalizeRecipients(value: string | string[]) {
  return Array.isArray(value) ? value : [value]
}

async function sendViaSmtp(input: SendEmailInput) {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.EMAIL_FROM) {
    throw new Error("SMTP settings are incomplete.")
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? false,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          }
        : undefined,
  })

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    replyTo: env.EMAIL_REPLY_TO ?? undefined,
    to: normalizeRecipients(input.to).join(", "),
    subject: input.subject,
    text: input.text,
    html: input.html ?? undefined,
  })
}

async function sendViaResend(input: SendEmailInput) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new Error("Resend settings are incomplete.")
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      reply_to: env.EMAIL_REPLY_TO ?? undefined,
      to: normalizeRecipients(input.to),
      subject: input.subject,
      text: input.text,
      html: input.html ?? undefined,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || `Resend request failed with status ${response.status}.`)
  }
}

export async function sendEmail(input: SendEmailInput) {
  if (!env.EMAIL_PROVIDER) {
    throw new Error("EMAIL_PROVIDER is not configured.")
  }

  if (env.EMAIL_PROVIDER === "smtp") {
    await sendViaSmtp(input)
    return
  }

  await sendViaResend(input)
}

export async function queueAndSendEmailNotification(input: SendEmailInput) {
  const recipients = normalizeRecipients(input.to)

  try {
    await sendEmail(input)
  } catch (error) {
    await prisma.systemLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        source: "email",
        action: "send.failed",
        message:
          error instanceof Error ? error.message : "Unknown email delivery failure.",
        projectId: input.projectId ?? null,
        clientId: input.clientId ?? null,
        severity: SystemSeverity.Warning,
        metadata: {
          subject: input.subject,
          recipients,
        },
      },
    })

    throw error
  }
}
