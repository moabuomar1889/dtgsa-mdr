import "server-only"
import { redirect } from "next/navigation"
import {
  getCurrentInternalSession,
  revokeInternalSession,
  INTERNAL_SESSION_COOKIE,
} from "@/server/services/identity/session-service"
import { cookies } from "next/headers"

export async function getCurrentAuthUser() {
  const session = await getCurrentInternalSession()
  if (!session) {
    return null
  }
  return {
    id: session.user.id,
    email: session.user.email,
    user_metadata: {
      full_name: session.user.fullName,
      job_title: session.user.jobTitle,
      timezone: session.user.timezone,
    },
    provider:
      session.authMode === "GOOGLE_WORKSPACE"
        ? "google_workspace"
        : "local_acceptance",
  }
}

export async function getCurrentAppUser() {
  const session = await getCurrentInternalSession()
  return session?.user ?? null
}

export async function requireCurrentAppUser() {
  const user = await getCurrentAppUser()

  if (!user) {
    redirect("/sign-in")
  }

  return user
}

export async function signOutCurrentUser() {
  const cookieStore = await cookies()
  await revokeInternalSession(cookieStore.get(INTERNAL_SESSION_COOKIE)?.value)
}
