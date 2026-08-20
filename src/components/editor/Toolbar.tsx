import { VIEWPORT_PRESETS } from './viewportPresets'
import { useEditorStore } from '../../features/project/store'

export function Toolbar() {
  const projectName = useEditorStore((state) => state.currentProject.name)
  const viewport = useEditorStore((state) => state.viewport)
  const canUndo = useEditorStore((state) => state.canUndo)
  const canRedo = useEditorStore((state) => state.canRedo)
  const setViewport = useEditorStore((state) => state.setViewport)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)

  const selectedPreset = VIEWPORT_PRESETS.find(
    (preset) => preset.width === viewport.width && preset.height === viewport.height,
  )

  return (
    <header className="toolbar">
      <div className="toolbar__identity">
        <span className="toolbar__product">UI Lab</span>
        <span className="toolbar__divider" aria-hidden="true" />
        <span className="toolbar__project-name">{projectName}</span>
      </div>
      <div className="toolbar__controls">
        <label className="toolbar__field">
          <span>Viewport</span>
          <select
            aria-label="Viewport preset"
            value={selectedPreset?.label ?? 'custom'}
            onChange={(event) => {
              const preset = VIEWPORT_PRESETS.find((item) => item.label === event.target.value)
              if (preset) setViewport({ width: preset.width, height: preset.height })
            }}
          >
            {VIEWPORT_PRESETS.map((preset) => <option key={preset.label} value={preset.label}>{preset.label}</option>)}
            <option value="custom" disabled>Custom (later)</option>
          </select>
        </label>
        <div className="toolbar__history" aria-label="History controls">
          <button type="button" onClick={undo} disabled={!canUndo} aria-label="Undo">Undo</button>
          <button type="button" onClick={redo} disabled={!canRedo} aria-label="Redo">Redo</button>
        </div>
        <div className="toolbar__future-actions">
          <button type="button" disabled title="Available in a later milestone">Import</button>
          <button type="button" disabled title="Available in a later milestone">Project Export</button>
          <button type="button" disabled title="Available in a later milestone">Codex Export</button>
        </div>
      </div>
    </header>
  )
}
