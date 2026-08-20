export function InspectorPanel() {
  return (
    <aside className="side-panel inspector-panel" aria-label="Inspector">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Properties</p>
          <h2>Inspector</h2>
        </div>
      </div>
      <div className="panel-empty">
        <span className="panel-empty__icon" aria-hidden="true">□</span>
        <strong>Nothing selected</strong>
        <span>Element properties will be available with visual editing.</span>
      </div>
    </aside>
  )
}
