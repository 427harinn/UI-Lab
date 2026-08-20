export function buildPreviewRoute(entry: string, path: string, state: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const separator = normalizedPath.includes('?') ? '&' : '?'
  return `${entry}#${normalizedPath}${separator}uilabState=${encodeURIComponent(state)}`
}
