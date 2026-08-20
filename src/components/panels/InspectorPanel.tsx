import { useEditorStore } from '../../features/project/store'

export function InspectorPanel() {
  const selectedElement = useEditorStore((state) => state.selectedElement)

  return (
    <aside className="side-panel inspector-panel" aria-label="Inspector">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Properties</p>
          <h2>Inspector</h2>
        </div>
      </div>
      {selectedElement ? (
        <div className="selection-summary" data-testid="selection-summary">
          <div className="selection-summary__identity">
            <span className="selection-summary__label">Selected instance</span>
            <strong>{selectedElement.componentId}</strong>
            <span data-testid="selected-instance-id">{selectedElement.elementId}</span>
          </div>
          <dl className="measurement-grid">
            <div><dt>X</dt><dd data-testid="measurement-x">{Math.round(selectedElement.frame.x)}</dd></div>
            <div><dt>Y</dt><dd data-testid="measurement-y">{Math.round(selectedElement.frame.y)}</dd></div>
            <div><dt>W</dt><dd data-testid="measurement-width">{Math.round(selectedElement.frame.width)}</dd></div>
            <div><dt>H</dt><dd data-testid="measurement-height">{Math.round(selectedElement.frame.height)}</dd></div>
          </dl>
          <p className="selection-summary__hint">Drag or resize the selected Adapter element in the preview.</p>
        </div>
      ) : (
        <div className="panel-empty">
          <span className="panel-empty__icon" aria-hidden="true">□</span>
          <strong>Nothing selected</strong>
          <span>Click an Adapter-exposed element in the preview.</span>
        </div>
      )}
    </aside>
  )
}
