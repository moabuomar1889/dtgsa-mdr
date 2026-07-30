import { joinClasses } from "@/components/dtg/classes"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={joinClasses(
        "bg-raise [animation:nocturne-pulse_1.2s_ease-in-out_infinite] rounded-[7px]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
