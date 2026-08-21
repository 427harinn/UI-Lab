import { useEffect, useRef, useState } from 'react'
import { VIEWPORT_PRESETS } from './viewportPresets'
import { ConfirmationDialog } from './ConfirmationDialog'
import { useEditorStore } from '../../features/project/store'
import { projectFilename, serializeProjectPackage } from '../../features/project/package'
import { codexExportFilename, serializeCodexExport } from '../../features/codex-export/export'
import { capturePreviewScreenshots } from '../../features/codex-export/previewCapture'

type ImportKind = 'mockup' | 'project'

export function Toolbar() {
  const projectName = useEditorStore((state) => state.currentProject.name)
  const changeCount = useEditorStore((state) => state.currentProject.changes.length)
  const viewport = useEditorStore((state) => state.viewport)
  const canUndo = useEditorStore((state) => state.canUndo)
  const canRedo = useEditorStore((state) => state.canRedo)
  const setViewport = useEditorStore((state) => state.setViewport)
  const interactionMode = useEditorStore((state) => state.interactionMode)
  const setInteractionMode = useEditorStore((state) => state.setInteractionMode)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const importMockupFile = useEditorStore((state) => state.importMockupFile)
  const importProjectFile = useEditorStore((state) => state.importProjectFile)
  const currentProject = useEditorStore((state) => state.currentProject)
  const importedMockup = useEditorStore((state) => state.importedMockup)
  const setImportError = useEditorStore((state) => state.setImportError)
  const setStatus = useEditorStore((state) => state.setStatus)
  const isImporting = useEditorStore((state) => state.isImporting)
  const importError = useEditorStore((state) => state.importError)
  const status = useEditorStore((state) => state.status)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const projectFileInputRef = useRef<HTMLInputElement>(null)
  const [isExportingProject, setIsExportingProject] = useState(false)
  const [isExportingCodex, setIsExportingCodex] = useState(false)
  const [pendingImport, setPendingImport] = useState<ImportKind>()

  const isBusy = isImporting || isExportingProject || isExportingCodex
  const selectedPreset = VIEWPORT_PRESETS.find(
    (preset) => preset.width === viewport.width && preset.height === viewport.height,
  )

  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(() => setStatus(undefined), 4500)
    return () => window.clearTimeout(timer)
  }, [setStatus, status])

  const openImport = (kind: ImportKind) => {
    if (isBusy) return
    if (changeCount > 0) {
      setPendingImport(kind)
      return
    }
    if (kind === 'mockup') fileInputRef.current?.click()
    else projectFileInputRef.current?.click()
  }

  const continueImport = () => {
    if (!pendingImport) return
    const kind = pendingImport
    setPendingImport(undefined)
    if (kind === 'mockup') fileInputRef.current?.click()
    else projectFileInputRef.current?.click()
  }

  return (
    <header className="toolbar">
      <div className="toolbar__identity">
        <span className="toolbar__product">UI Lab</span>
        <span className="toolbar__divider" aria-hidden="true" />
        <span className="toolbar__project-name">{projectName}</span>
        {changeCount > 0 && <span className="dirty-indicator" data-testid="dirty-indicator">● {changeCount} changes</span>}
      </div>
      <div className="toolbar__controls">
        <div className="interaction-mode" aria-label="Preview interaction mode">
          <span className="interaction-mode__label">Preview</span>
          <div className="interaction-mode__toggle" role="group" aria-label="Preview interaction mode">
            <button
              type="button"
              className="interaction-mode__button"
              aria-pressed={interactionMode === 'select'}
              onClick={() => setInteractionMode('select')}
            >
              Select
            </button>
            <button
              type="button"
              className="interaction-mode__button"
              aria-pressed={interactionMode === 'interact'}
              onClick={() => setInteractionMode('interact')}
            >
              Interact
            </button>
          </div>
        </div>
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
          <button type="button" onClick={undo} disabled={!canUndo || isBusy} aria-label="Undo">Undo</button>
          <button type="button" onClick={redo} disabled={!canRedo || isBusy} aria-label="Redo">Redo</button>
        </div>
        <div className="toolbar__future-actions">
          <input ref={fileInputRef} className="visually-hidden" type="file" accept=".zip,application/zip" aria-label="Mockup ZIP file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importMockupFile(file); event.target.value = '' }} />
          <input ref={projectFileInputRef} className="visually-hidden" type="file" accept=".ui-project,application/zip" aria-label="UI Lab project file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importProjectFile(file); event.target.value = '' }} />
          <button type="button" onClick={() => openImport('mockup')} disabled={isBusy} aria-label="Import Mockup">{isImporting ? 'Importing…' : 'Import Mockup'}</button>
          <button type="button" onClick={() => openImport('project')} disabled={isBusy} aria-label="Import Project">{isImporting ? 'Importing…' : 'Import Project'}</button>
          <span className="toolbar__trusted-note">Trusted local files</span>
          <button type="button" disabled={isBusy} onClick={async () => {
            if (isBusy) return
            setIsExportingProject(true)
            setImportError(undefined)
            try {
              const bytes = await serializeProjectPackage(currentProject, importedMockup)
              const url = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: 'application/zip' }))
              try {
                const anchor = document.createElement('a')
                anchor.href = url
                anchor.download = projectFilename(currentProject.name)
                document.body.appendChild(anchor)
                anchor.click()
                anchor.remove()
              } finally { URL.revokeObjectURL(url) }
              setStatus({ kind: 'success', message: 'Project exported' })
            } catch (error) {
              setImportError(error instanceof Error ? error.message : 'The project could not be exported.')
              setStatus({ kind: 'error', message: 'Project Export error. The project could not be exported.' })
            } finally { setIsExportingProject(false) }
          }}>{isExportingProject ? 'Exporting…' : 'Export Project'}</button>
          <button type="button" disabled={isBusy} onClick={async () => {
            if (isBusy) return
            setIsExportingCodex(true)
            setImportError(undefined)
            try {
              const bytes = await serializeCodexExport(currentProject, importedMockup, capturePreviewScreenshots)
              const url = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: 'application/zip' }))
              try {
                const anchor = document.createElement('a')
                anchor.href = url
                anchor.download = codexExportFilename(currentProject.name)
                document.body.appendChild(anchor)
                anchor.click()
                anchor.remove()
              } finally { URL.revokeObjectURL(url) }
              setStatus({ kind: 'success', message: 'Codex package exported' })
            } catch (error) {
              setImportError(error instanceof Error ? error.message : 'The Codex Export could not be created.')
              const isScreenshotError = error instanceof Error && /screenshot|preview/i.test(error.message)
              setStatus({ kind: 'error', message: isScreenshotError ? 'Screenshot error. Codex Export was not created because a reference image failed.' : 'Codex Export error. The export package could not be created.' })
            } finally { setIsExportingCodex(false) }
          }}>{isExportingCodex ? 'Exporting…' : 'Export for Codex'}</button>
        </div>
      </div>
      <div className="toolbar__status" aria-live="polite" aria-atomic="true">
        {status && <span className={`status-message status-message--${status.kind}`}>{status.message}</span>}
      </div>
      {importError && <div className="toolbar__import-error" role="alert" data-dev-details={importError}>Details: {importError}</div>}
      {pendingImport && <ConfirmationDialog title="Replace current project?" message="Current edits will be replaced. Continue?" onCancel={() => setPendingImport(undefined)} onContinue={continueImport} />}
    </header>
  )
}
