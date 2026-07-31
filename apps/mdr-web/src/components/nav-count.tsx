const toneClass = {
  accent: "text-accent-txt",
  bad: "text-bad",
  dim: "text-dim",
} as const

// Design §4: every count in the shell is mono and right-aligned in its row.
// Semantic colour is meaning, not decoration — `bad` marks a queue that is
// overdue or blocked, `accent` marks work waiting on the current user.
export function NavCount({
  count,
  tone = "dim",
}: {
  count?: number
  tone?: keyof typeof toneClass
}) {
  if (count === undefined || count <= 0) {
    return null
  }

  // Decorative: the number would otherwise be folded into the link's
  // accessible name ("Client Replies 1"). The destination page states the same
  // count in context, so assistive tech keeps the plain nav label.
  return (
    <span
      aria-hidden="true"
      className={`ml-auto shrink-0 font-mono text-[10.5px] ${toneClass[tone]}`}
    >
      {count > 999 ? "999+" : count}
    </span>
  )
}
