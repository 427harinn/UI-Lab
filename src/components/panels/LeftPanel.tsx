import { getStatesForScreen } from '../../schemas/adapter'
import { useEditorStore } from '../../features/project/store'

export function LeftPanel() {
  const project = useEditorStore((state) => state.currentProject)
  const importedMockup = useEditorStore((state) => state.importedMockup)
  const currentScreenId = useEditorStore((state) => state.currentScreenId)
  const currentStateId = useEditorStore((state) => state.currentStateId)
  const setCurrentScreenId = useEditorStore((state) => state.setCurrentScreenId)
  const setCurrentStateId = useEditorStore((state) => state.setCurrentStateId)
  const screens = importedMockup?.screens ?? project.screens
  const selectedScreen = screens.find((screen) => screen.id === currentScreenId)
  const states: Array<{ id: string; name: string }> = importedMockup
    ? getStatesForScreen(importedMockup.states, currentScreenId ?? '')
    : selectedScreen && 'states' in selectedScreen ? selectedScreen.states : []

  return (
    <aside className="side-panel left-panel" aria-label="Screens and states">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Navigator</p>
          <h2>Screens &amp; States</h2>
        </div>
      </div>
      {screens.length === 0 ? (
        <div className="panel-empty">
          <span className="panel-empty__icon" aria-hidden="true">◌</span>
          <strong>No screens yet</strong>
          <span>A blank project starts with an empty canvas.</span>
        </div>
      ) : (
        <div className="navigator-content">
          <section className="navigator-section" aria-labelledby="screens-heading">
            <h3 id="screens-heading">Screens</h3>
            <div className="navigator-list">
              {screens.map((screen) => (
                <button
                  key={screen.id}
                  type="button"
                  className="navigator-item"
                  aria-pressed={screen.id === currentScreenId}
                  onClick={() => setCurrentScreenId(screen.id)}
                >
                  <span>{screen.name}</span>
                  <span className="navigator-item__meta">{'path' in screen ? screen.path : screen.route}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="navigator-section" aria-labelledby="states-heading">
            <h3 id="states-heading">States</h3>
            {states.length === 0 ? (
              <p className="navigator-empty">No states declared for this screen.</p>
            ) : (
              <div className="navigator-list">
                {states.map((state) => (
                  <button
                    key={state.id}
                    type="button"
                    className="navigator-item"
                    aria-pressed={state.id === currentStateId}
                    onClick={() => setCurrentStateId(state.id)}
                  >
                    <span>{state.name}</span>
                    <span className="navigator-item__meta">{state.id}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </aside>
  )
}
