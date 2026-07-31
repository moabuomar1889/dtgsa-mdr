import Link from "next/link"

type RegisterPaginationProps = {
  basePath: string
  page: number
  pageSize: number
  total: number
  pageCount: number
}

// Server component: paging is a URL change, so it needs no client JavaScript.
export function RegisterPagination({
  basePath,
  page,
  pageSize,
  total,
  pageCount,
}: RegisterPaginationProps) {
  if (total === 0) {
    return null
  }

  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)
  const linkClass =
    "border-edge text-muted rounded-[7px] border px-2.5 py-1 text-[11.5px]"
  const disabledClass =
    "border-line text-dim rounded-[7px] border px-2.5 py-1 text-[11.5px] opacity-50"

  return (
    <nav
      aria-label="Register pages"
      className="border-line flex items-center justify-between gap-3 border-t px-3.5 py-2.5"
    >
      <p className="text-dim text-[11px]">
        Showing <span className="font-mono">{first}</span>–
        <span className="font-mono">{last}</span> of{" "}
        <span className="font-mono">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={`${basePath}?page=${page - 1}`} className={linkClass} data-b>
            Previous
          </Link>
        ) : (
          <span className={disabledClass}>Previous</span>
        )}
        <span className="text-dim font-mono text-[10.5px]">
          {page} / {pageCount}
        </span>
        {page < pageCount ? (
          <Link href={`${basePath}?page=${page + 1}`} className={linkClass} data-b>
            Next
          </Link>
        ) : (
          <span className={disabledClass}>Next</span>
        )}
      </div>
    </nav>
  )
}
