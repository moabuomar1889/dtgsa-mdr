import { Skeleton } from "@/components/dtg/skeleton"

// Every module route is `force-dynamic`, so without this fallback a client
// transition shows the previous screen until the server render completes.
export default function AppSegmentLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading workspace module"
      className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5"
    >
      <div className="border-line bg-panel overflow-hidden rounded-[9px] border">
        <div className="border-line bg-head space-y-3 border-b px-6 py-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-32 rounded-[4px]" />
            <Skeleton className="h-5 w-24 rounded-[4px]" />
          </div>
          <Skeleton className="h-6 w-full max-w-2xl" />
          <Skeleton className="h-4 w-full max-w-3xl" />
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="border-line bg-raise space-y-3 rounded-[9px] border p-4"
            >
              <Skeleton className="size-9 rounded-[10px]" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>

      <div className="border-line bg-panel rounded-[9px] border">
        <div className="border-line border-b px-6 py-4">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="space-y-3 p-6">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full rounded-[7px]" />
          ))}
        </div>
      </div>
    </div>
  )
}
