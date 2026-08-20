import { useRef } from 'react'
import { VIEWPORT_PRESETS } from './viewportPresets'
import { useEditorStore } from '../../features/project/store'
import { projectFilename, serializeProjectPackage } from '../../features/project/package'

export function Toolbar() {
  const projectName = useEditorStore((state) => state.currentProject.name)
  const viewport = useEditorStore((state) => state.viewport)
  const canUndo = useEditorStore((state) => state.canUndo)
  const canRedo = useEditorStore((state) => state.canRedo)
  const setViewport = useEditorStore((state) => state.setViewport)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const importMockupFile = useEditorStore((state) => state.importMockupFile)
  const importProjectFile = useEditorStore((state) => state.importProjectFile)
  const currentProject = useEditorStore((state) => state.currentProject)
  const importedMockup = useEditorStore((state) => state.importedMockup)
  const setImportError = useEditorStore((state) => state.setImportError)
  const isImporting = useEditorStore((state) => state.isImporting)
  const importError = useEditorStore((state) => state.importError)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const projectFileInputRef = useRef<HTMLInputElement>(null)

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
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept=".zip,application/zip"
            aria-label="Mockup ZIP file"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void importMockupFile(file)
              event.target.value = ''
            }}
          />
          <input
            ref={projectFileInputRef}
            className="visually-hidden"
            type="file"
            accept=".ui-project,application/zip"
            aria-label="UI Lab project file"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void importProjectFile(file)
              event.target.value = ''
            }}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            {isImporting ? 'Importing…' : 'Import Mockup'}
          </button>
          <button type="button" onClick={() => projectFileInputRef.current?.click()} disabled={isImporting}>Import Project</button>
          <span className="toolbar__trusted-note">Trusted local files</span>
          <button
            type="button"
            onClick={async () => {
              try {
                const bytes = await serializeProjectPackage(currentProject, importedMockup)
                const blobBytes = new Uint8Array(bytes.byteLength)
                blobBytes.set(bytes)
                const url = URL.createObjectURL(new Blob([blobBytes.buffer], { type: 'application/zip' }))
                const anchor = document.createElement('a')
                anchor.href = url
                anchor.download = projectFilename(currentProject.name)
                document.body.appendChild(anchor)
                anchor.click()
                anchor.remove()
                URL.revokeObjectURL(url)
                setImportError(undefined)
              } catch (error) {
                setImportError(error instanceof Error ? error.message : 'The project could not be exported.')
              }
            }}
            disabled={isImporting}
          >
            Export Project
          </button>
          <button type="button" disabled title="Available in a later milestone">Codex Export</button>
        </div>
      </div>
      {importError && <div className="toolbar__import-error" role="alert">{importError}</div>}
    </header>
  )
}
