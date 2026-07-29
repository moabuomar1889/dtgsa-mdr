import { redirect } from "next/navigation"
import { getCurrentAuthUser } from "@/server/services/auth/auth-service"

export const dynamic = "force-dynamic"

export default async function Home() {
  const authUser = await getCurrentAuthUser()

  redirect(authUser ? "/dashboard" : "/sign-in")
}
