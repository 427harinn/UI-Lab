import { useEditorStore } from '../../features/project/store'

export function Preview() {
  const viewport = useEditorStore((state) => state.viewport)

  return (
    <section className="preview-panel" aria-label="Preview area">
      <div className="panel-heading preview-panel__heading">
        <div>
          <p className="eyebrow">Canvas</p>
          <h1>Preview</h1>
        </div>
        <span className="status-chip">Blank project</span>
      </div>
      <div className="preview-stage">
        <div
          className="viewport-frame"
          data-testid="viewport-frame"
          aria-label={`Preview viewport ${viewport.width} by ${viewport.height}`}
          style={{ width: `${viewport.width}px`, height: `${viewport.height}px` }}
        >
          <div className="viewport-frame__empty">
            <span className="empty-glyph" aria-hidden="true">+</span>
            <strong>No screen selected</strong>
            <span>Import support arrives in a later milestone.</span>
          </div>
        </div>
      </div>
      <footer className="preview-panel__footer">{viewport.width} × {viewport.height}px</footer>
    </section>
  )
}
