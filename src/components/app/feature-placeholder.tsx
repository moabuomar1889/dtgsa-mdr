import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type FeaturePlaceholderProps = {
  badge: string
  title: string
  description: string
  nextSteps: string[]
}

export function FeaturePlaceholder({
  badge,
  title,
  description,
  nextSteps,
}: FeaturePlaceholderProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="gap-3 border-b border-border/60 bg-gradient-to-br from-primary/12 via-transparent to-transparent">
          <Badge className="w-fit rounded-full bg-primary/15 px-3 py-1 text-primary hover:bg-primary/15">
            {badge}
          </Badge>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {title}
          </CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {nextSteps.map((step) => (
              <div
                key={step}
                className="rounded-2xl border border-border/60 bg-background/80 p-4 text-sm leading-6 text-muted-foreground"
              >
                {step}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
