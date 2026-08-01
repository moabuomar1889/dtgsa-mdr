export function isLocalAcceptanceEnabled(environment: {
  LOCAL_ACCEPTANCE_MODE?: string
  NODE_ENV?: string
}) {
  return (
    environment.LOCAL_ACCEPTANCE_MODE === "true" &&
    environment.NODE_ENV !== "production"
  )
}
