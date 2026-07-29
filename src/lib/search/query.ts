export function normalizeSearchQuery(query: string | null | undefined) {
  return query?.trim() ?? ""
}

export function createEmptySearchResult(search: string) {
  return {
    search,
    counts: {
      projects: 0,
      pdiItems: 0,
      mdrDocuments: 0,
      transmittals: 0,
      clientReplies: 0,
    },
    projects: [],
    pdiItems: [],
    mdrDocuments: [],
    transmittals: [],
    clientReplies: [],
  }
}
