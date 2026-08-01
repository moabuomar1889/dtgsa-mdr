export default function WorkRegisterLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <div className="border-line bg-panel h-44 animate-pulse rounded-[10px] border" />
      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.76fr)_minmax(0,1.5fr)]">
        <div className="border-line bg-panel h-96 animate-pulse rounded-[10px] border" />
        <div className="grid gap-4">
          <div className="border-line bg-panel h-28 animate-pulse rounded-[10px] border" />
          <div className="border-line bg-panel h-72 animate-pulse rounded-[10px] border" />
        </div>
      </div>
    </div>
  )
}
