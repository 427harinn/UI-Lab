import { useEffect } from 'react'
import { Toolbar } from './Toolbar'
import { LeftPanel } from '../panels/LeftPanel'
import { InspectorPanel } from '../panels/InspectorPanel'
import { Preview } from './Preview'
import { getEditorShortcut } from '../../features/editor/shortcuts'
import { useEditorStore } from '../../features/project/store'

export function EditorShell() {
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const setSelection = useEditorStore((state) => state.setSelection)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcut = getEditorShortcut(event)
      if (!shortcut) return
      if (shortcut === 'undo') {
        event.preventDefault()
        undo()
      } else if (shortcut === 'redo') {
        event.preventDefault()
        redo()
      } else {
        event.preventDefault()
        setSelection(undefined)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [redo, setSelection, undo])

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
