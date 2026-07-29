"use server"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import {
  setupFirstAdmin,
  signInWithPassword,
  signOutCurrentUser,
} from "@/server/services/auth/auth-service"
import {
  INTERNAL_CSRF_COOKIE,
  INTERNAL_SESSION_COOKIE,
} from "@/server/services/identity/session-service"

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

export async function signInAction(formData: FormData) {
  try {
    await signInWithPassword({
      email: readString(formData, "email"),
      password: readString(formData, "password"),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign in failed."
    redirect(`/sign-in?error=${encodeURIComponent(message)}`)
  }

  redirect("/dashboard")
}

export async function setupFirstAdminAction(formData: FormData) {
  try {
    await setupFirstAdmin({
      email: readString(formData, "email"),
      password: readString(formData, "password"),
      fullName: readString(formData, "fullName"),
      jobTitle: readString(formData, "jobTitle"),
    })

    await signInWithPassword({
      email: readString(formData, "email"),
      password: readString(formData, "password"),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Bootstrap setup failed."
    redirect(`/sign-in?error=${encodeURIComponent(message)}`)
  }

  redirect("/dashboard")
}

export async function signOutAction() {
  await signOutCurrentUser()
  const cookieStore = await cookies()
  cookieStore.delete(INTERNAL_SESSION_COOKIE)
  cookieStore.delete(INTERNAL_CSRF_COOKIE)
  redirect("/sign-in")
}
