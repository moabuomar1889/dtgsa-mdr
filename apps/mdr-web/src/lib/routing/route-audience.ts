export function routeAudience(pathname: string) {
  // Always allow the route itself to decide whether local acceptance exists.
  // Otherwise production requests are redirected before the route can return
  // its required 404 response.
  if (pathname.startsWith("/local-acceptance")) {
    return "auth"
  }
  if (
    pathname === "/sign-in" ||
    pathname === "/access-denied" ||
    pathname === "/portal/access" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/portal/magic-link"
  ) {
    return "auth"
  }
  if (pathname.startsWith("/portal") || pathname.startsWith("/api/portal/")) {
    return "external"
  }
  if (pathname.startsWith("/verify") || pathname.startsWith("/api/verify/")) {
    return "public"
  }
  return "internal"
}
