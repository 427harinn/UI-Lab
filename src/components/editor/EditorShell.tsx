import { Toolbar } from './Toolbar'
import { LeftPanel } from '../panels/LeftPanel'
import { InspectorPanel } from '../panels/InspectorPanel'
import { Preview } from './Preview'

export function EditorShell() {
  return (
    <div className="editor-shell" data-testid="editor-shell">
      <Toolbar />
      <main className="editor-layout">
        <LeftPanel />
        <Preview />
        <InspectorPanel />
      </main>
    </div>
  )
}
