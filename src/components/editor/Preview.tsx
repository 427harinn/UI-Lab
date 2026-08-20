import { useEffect, useMemo, useRef } from 'react'
import { useEditorStore } from '../../features/project/store'
import { buildPreviewRoute } from '../../features/mockup/route'
import { getScreenPath } from '../../schemas/adapter'

export function Preview() {
  const viewport = useEditorStore((state) => state.viewport)
  const project = useEditorStore((state) => state.currentProject)
  const importedMockup = useEditorStore((state) => state.importedMockup)
  const currentScreenId = useEditorStore((state) => state.currentScreenId)
  const currentStateId = useEditorStore((state) => state.currentStateId)
  const setImportError = useEditorStore((state) => state.setImportError)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const previewSource = useMemo(() => {
    if (!importedMockup || typeof URL.createObjectURL !== 'function') return undefined
    return URL.createObjectURL(new Blob([importedMockup.previewHtml], { type: 'text/html' }))
  }, [importedMockup])

  useEffect(() => () => {
    if (previewSource) URL.revokeObjectURL(previewSource)
  }, [previewSource])

  const selectedScreen = importedMockup?.screens.find((screen) => screen.id === currentScreenId)
  const route = importedMockup && selectedScreen && currentStateId
    ? buildPreviewRoute(previewSource ?? importedMockup.entry, getScreenPath(selectedScreen), currentStateId)
    : undefined
  const hasPersistedMockup = project.source.type === 'mockup' && !importedMockup

  return (
    <section className="preview-panel" aria-label="Preview area">
      <div className="panel-heading preview-panel__heading">
        <div>
          <p className="eyebrow">Canvas</p>
          <h1>Preview</h1>
        </div>
        <span className="status-chip">{importedMockup ? 'Imported preview' : hasPersistedMockup ? 'Re-import required' : 'Blank project'}</span>
      </div>
      <div className="preview-stage">
        <div
          className="viewport-frame"
          data-testid="viewport-frame"
          aria-label={`Preview viewport ${viewport.width} by ${viewport.height}`}
          style={{ width: `${viewport.width}px`, height: `${viewport.height}px` }}
        >
          {importedMockup && route ? (
            <iframe
              ref={iframeRef}
              title={`${importedMockup.name} preview`}
              className="preview-frame"
              src={previewSource ? route : undefined}
              srcDoc={previewSource ? undefined : importedMockup.previewHtml}
              onLoad={() => {
                try {
                  if (!iframeRef.current?.contentDocument || !iframeRef.current.contentWindow) {
                    throw new Error('DOM access unavailable')
                  }
                  setImportError(undefined)
                } catch {
                  setImportError('The preview loaded, but UI Lab cannot inspect its iframe DOM. Re-import a same-origin single-file preview.')
                }
              }}
              onError={() => setImportError('The imported preview could not load inside the iframe.')}
            />
          ) : (
            <div className="viewport-frame__empty">
              <span className="empty-glyph" aria-hidden="true">+</span>
              <strong>{hasPersistedMockup ? 'Re-import mockup to preview' : 'No screen selected'}</strong>
              <span>{hasPersistedMockup ? 'Imported preview files are kept in memory only.' : 'Import an Adapter v1 mockup ZIP to begin.'}</span>
            </div>
          )}
        </div>
      </div>
      <footer className="preview-panel__footer">{viewport.width} × {viewport.height}px</footer>
    </section>
  )
}
