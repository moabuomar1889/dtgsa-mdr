export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col gap-3 px-3 py-3 md:px-5 md:py-4">
      <div className="border-line bg-panel h-52 animate-pulse rounded-[12px] border" />
      <div className="border-line bg-panel grid grid-cols-2 overflow-hidden rounded-[10px] border lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="border-line h-16 animate-pulse border-l first:border-l-0"
          />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <div className="border-line bg-panel h-60 animate-pulse rounded-[10px] border" />
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="border-line bg-panel h-96 animate-pulse rounded-[10px] border" />
            <div className="border-line bg-panel h-96 animate-pulse rounded-[10px] border" />
          </div>
        </div>
        <div className="border-line bg-panel hidden h-[680px] animate-pulse rounded-[10px] border xl:block" />
      </div>
    </div>
  )
}
