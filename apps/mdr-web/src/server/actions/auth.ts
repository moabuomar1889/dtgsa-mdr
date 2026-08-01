"use server"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { signOutCurrentUser } from "@/server/services/auth/auth-service"
import {
  INTERNAL_CSRF_COOKIE,
  INTERNAL_SESSION_COOKIE,
} from "@/server/services/identity/session-service"

export async function signOutAction() {
  await signOutCurrentUser()
  const cookieStore = await cookies()
  cookieStore.delete(INTERNAL_SESSION_COOKIE)
  cookieStore.delete(INTERNAL_CSRF_COOKIE)
  // The internal session is only one half of production authentication.
  // End the Cloudflare Access session too; otherwise /sign-in immediately
  // receives the still-valid Access assertion and signs the user back in.
  redirect("/cdn-cgi/access/logout")
}
