export function LeftPanel() {
  return (
    <aside className="side-panel left-panel" aria-label="Screens and states">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Navigator</p>
          <h2>Screens &amp; States</h2>
        </div>
      </div>
      <div className="panel-empty">
        <span className="panel-empty__icon" aria-hidden="true">◌</span>
        <strong>No screens yet</strong>
        <span>A blank project starts with an empty canvas.</span>
      </div>
    </aside>
  )
}
