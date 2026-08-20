export interface PreviewCaptureScope {
  screenId: string
  stateId: string
  targets?: Array<{ componentId: string; instanceId: string }>
}

export type PreviewCaptureHandler = (scopes: PreviewCaptureScope[]) => Promise<Record<string, Uint8Array>>

let activeHandler: PreviewCaptureHandler | undefined

export function registerPreviewCapture(handler: PreviewCaptureHandler): () => void {
  activeHandler = handler
  return () => {
    if (activeHandler === handler) activeHandler = undefined
  }
}

export async function capturePreviewScreenshots(scopes: PreviewCaptureScope[]): Promise<Record<string, Uint8Array>> {
  if (!activeHandler) throw new Error('The preview is not available for screenshot capture.')
  return activeHandler(scopes)
}

export function previewScopeFilename(scope: PreviewCaptureScope): string {
  return `${scope.screenId}-${scope.stateId}.png`
}

export function previewScopeKey(scope: PreviewCaptureScope): string {
  return `${scope.screenId}::${scope.stateId}`
}
