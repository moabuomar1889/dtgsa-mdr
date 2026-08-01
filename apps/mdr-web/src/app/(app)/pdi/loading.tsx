export default function PdiLoading() {
  return (
    <div className="flex flex-1 flex-col gap-3 px-3 py-3 md:px-5 md:py-4">
      <div className="border-line bg-panel h-36 animate-pulse rounded-[12px] border" />
      <div className="border-line bg-panel h-72 animate-pulse rounded-[12px] border" />
    </div>
  )
}
