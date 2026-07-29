const targets = (process.env.SMOKE_TARGETS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
if (!targets.length) throw new Error("SMOKE_TARGETS is required.")
for (const target of targets) {
  const base = new URL(target)
  if (base.protocol !== "https:" && base.hostname !== "127.0.0.1") {
    throw new Error(`Unsafe smoke target: ${base.origin}`)
  }
  for (const path of ["/api/health", "/api/ready"]) {
    const response = await fetch(new URL(path, base), {
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok)
      throw new Error(`${base.origin}${path}: ${response.status}`)
  }
}
console.log(`Smoke checks passed for ${targets.length} target(s).`)
