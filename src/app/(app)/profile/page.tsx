import { requireCurrentAppUser } from "@/server/services/auth/auth-service"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const user = await requireCurrentAppUser()

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
          <Badge className="w-fit rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
            Account
          </Badge>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            User profile and signature readiness.
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            This page now reflects the signed-in user from Supabase and the
            domain user table. Signature profile editing will be added in the
            next slice.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Full name</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">
              {user.fullName}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">
              {user.email}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Job title</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">
              {user.jobTitle ?? "Not set"}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">Signature profile</p>
            <p className="mt-2 text-xl font-semibold tracking-tight">
              {user.signatureProfile ? "Configured" : "Pending"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
