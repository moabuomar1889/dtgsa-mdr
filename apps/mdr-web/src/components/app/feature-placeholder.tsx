import { Badge } from "@/components/dtg/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/dtg/card"

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
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <Card className="border-line bg-panel">
        <CardHeader className="border-line bg-head gap-2 border-b">
          <Badge className="bg-accent-bg text-accent-txt hover:bg-accent-bg w-fit rounded-[4px] px-1.5 py-0.5">
            {badge}
          </Badge>
          <CardTitle className="text-[22px] font-medium tracking-[-0.02em]">
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
                className="border-line bg-raise text-soft rounded-[9px] border p-4 text-sm leading-6"
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
