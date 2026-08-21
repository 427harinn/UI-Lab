export function buildPreviewRoute(entry: string, path: string, state: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const separator = normalizedPath.includes('?') ? '&' : '?'
  return `${entry}#${normalizedPath}${separator}uilabState=${encodeURIComponent(state)}`
}

export function parsePreviewHash(hash: string): { path: string; state?: string } | undefined {
  if (!hash.startsWith('#/')) return undefined
  const [rawPath, rawQuery = ''] = hash.slice(1).split('?')
  const state = new URLSearchParams(rawQuery).get('uilabState') ?? undefined
  return { path: rawPath, state }
}
