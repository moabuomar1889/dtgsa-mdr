import "server-only"
import { cookies } from "next/headers"
import { hashOpaqueToken } from "@dtg/identity-domain"
import { prisma } from "./database"

const SESSION_COOKIE = "dtg_internal_session"

export async function getApprovalActor() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  const now = new Date()
  const session = await prisma.internalAuthSession.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    include: {
      user: {
        include: {
          identities: { include: { google: true } },
          employeeProfile: true,
          projectRoles: { include: { role: true, project: true } },
          userRoles: { include: { role: true } },
        },
      },
    },
  })
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= now ||
    !session.user.isActive ||
    session.user.deletedAt
  ) {
    return null
  }
  return {
    id: session.user.id,
    fullName: session.user.fullName,
    email: session.user.email,
    jobTitle: session.user.jobTitle,
    sessionId: session.id,
    sessionHash: session.tokenHash,
    projectRoles: session.user.projectRoles,
    systemRoles: session.user.userRoles.map((item) => item.role.code),
    googleSubject:
      session.user.identities
        .map((identity) => identity.google?.googleSubject)
        .find(Boolean) ?? null,
    employeeCode: session.user.employeeProfile?.employeeCode ?? null,
    departmentId: session.user.employeeProfile?.departmentId ?? null,
  }
}

export async function requireApprovalActor() {
  const actor = await getApprovalActor()
  if (!actor) throw new Error("Approval authentication is required.")
  return actor
}
