import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import JSZip from 'jszip'
import App from './App'
import { createBlankProject } from './features/project/blankProject'
import { useEditorStore } from './features/project/store'
import { serializeProjectPackage } from './features/project/package'

async function createMockupFile(name = 'synthetic.zip'): Promise<File> {
  const zip = new JSZip()
  zip.file('.uilab/project.json', JSON.stringify({
    formatVersion: 1,
    name: 'Synthetic mockup',
    entry: 'dist/index.html',
    defaultViewport: { width: 430, height: 932 },
  }))
  zip.file('.uilab/screens.json', JSON.stringify({
    home: { name: 'Home', path: '/home', defaultState: 'normal' },
    shopping: { name: 'Shopping', path: '/shopping', defaultState: 'empty' },
  }))
  zip.file('.uilab/components.json', JSON.stringify({
    'Home.TaskRow': { selector: "[data-uilab-component='Home.TaskRow']", instances: 'single', editable: ['width'] },
  }))
  zip.file('.uilab/tokens.json', JSON.stringify({ accent: '#f00' }))
  zip.file('.uilab/states.json', JSON.stringify({
    home: { normal: { name: 'Normal' }, overdue: { name: 'Overdue' } },
    shopping: { empty: { name: 'Empty' } },
  }))
  zip.file('dist/index.html', '<!doctype html><html><body><main>Preview</main></body></html>')
  const bytes = await zip.generateAsync({ type: 'uint8array' })
  return new File([bytes.buffer as ArrayBuffer], name, { type: 'application/zip' })
}

describe('editor shell', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useEditorStore.getState().replaceProject(createBlankProject())
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders the three-pane foundation', () => {
    render(<App />)

    expect(screen.getByText('UI Lab')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Screens and states' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Preview area' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Inspector' })).toBeInTheDocument()
    expect(screen.getByTestId('viewport-frame')).toHaveStyle({ width: '390px', height: '844px' })
  })

  it('changes the viewport frame when a preset is selected', () => {
    render(<App />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Viewport preset' }), { target: { value: '430 × 932' } })

    expect(screen.getByTestId('viewport-frame')).toHaveStyle({ width: '430px', height: '932px' })
    expect(screen.getByText('430 × 932px')).toBeInTheDocument()
  })

  it('imports a mockup, populates screens/states, and applies its default viewport', async () => {
    render(<App />)
    const input = screen.getByLabelText('Mockup ZIP file')
    fireEvent.change(input, { target: { files: [await createMockupFile()] } })

    expect(await screen.findByRole('button', { name: /^Home/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Normal/ })).toBeInTheDocument()
    expect(screen.getByTestId('viewport-frame')).toHaveStyle({ width: '430px', height: '932px' })
    expect(useEditorStore.getState().currentScreenId).toBe('home')
    expect(useEditorStore.getState().currentStateId).toBe('normal')
    expect(useEditorStore.getState().currentProject.components).toHaveLength(1)
    expect(useEditorStore.getState().currentProject.tokens).toEqual({ accent: '#f00' })
    expect(useEditorStore.getState().currentProject.components[0]).toMatchObject({
      selector: "[data-uilab-component='Home.TaskRow']",
      editableProperties: ['width'],
    })
  })

  it('switches screen to its default state and switches declared states', async () => {
    render(<App />)
    const input = screen.getByLabelText('Mockup ZIP file')
    fireEvent.change(input, { target: { files: [await createMockupFile()] } })
    await screen.findByRole('button', { name: /^Home/ })

    fireEvent.click(screen.getByRole('button', { name: /^Overdue/ }))
    expect(useEditorStore.getState().currentStateId).toBe('overdue')
    expect(screen.getByTitle('Synthetic mockup preview')).toHaveAttribute('src', expect.stringContaining('uilabState=overdue'))

    fireEvent.click(screen.getByRole('button', { name: /^Shopping/ }))
    await waitFor(() => expect(useEditorStore.getState().currentScreenId).toBe('shopping'))
    expect(useEditorStore.getState().currentStateId).toBe('empty')
    expect(screen.getByTitle('Synthetic mockup preview')).toHaveAttribute('src', expect.stringContaining('#/shopping?uilabState=empty'))
    expect(screen.getByRole('button', { name: /^Empty/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Overdue/ })).not.toBeInTheDocument()
  })

  it('imports a project package after switching to blank state and restores preview metadata and changes', async () => {
    render(<App />)
    const mockupInput = screen.getByLabelText('Mockup ZIP file')
    fireEvent.change(mockupInput, { target: { files: [await createMockupFile('house.zip')] } })
    await screen.findByRole('button', { name: /^Home/ })

    const current = useEditorStore.getState().currentProject
    useEditorStore.getState().commitProject({
      ...current,
      changes: [{
        id: 'restored-width', screenId: 'home', stateId: 'normal', elementId: 'task-bird', componentId: 'Home.TaskRow',
        property: 'width', before: 120, after: 206, valueType: 'visual', updatedAt: '2026-08-20T00:00:00.000Z',
      }],
    })
    const archive = await serializeProjectPackage(useEditorStore.getState().currentProject, useEditorStore.getState().importedMockup)
    useEditorStore.getState().replaceProject(createBlankProject())

    const projectInput = screen.getByLabelText('UI Lab project file')
    fireEvent.change(projectInput, { target: { files: [new File([archive.buffer as ArrayBuffer], 'HouseToDo.ui-project', { type: 'application/zip' })] } })

    expect(await screen.findByRole('button', { name: /^Home/ })).toBeInTheDocument()
    expect(screen.getByTestId('viewport-frame')).toHaveStyle({ width: '430px', height: '932px' })
    expect(useEditorStore.getState().currentProject.name).toBe('Synthetic mockup')
    expect(useEditorStore.getState().currentProject.changes[0].after).toBe(206)
    expect(screen.getByTitle('Synthetic mockup preview')).toBeInTheDocument()
  })

  it('shows a readable error for an invalid import', async () => {
    render(<App />)
    const input = screen.getByLabelText('Mockup ZIP file')
    fireEvent.change(input, { target: { files: [new File(['not a zip'], 'broken.zip', { type: 'application/zip' })] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('not a readable ZIP archive')
    expect(screen.getByRole('button', { name: 'Import Mockup' })).toBeEnabled()
  })

  it('revokes the temporary download Blob URL after Project Export', async () => {
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:project-export')
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Export Project' }))
    await waitFor(() => expect(screen.getByText('Project exported')).toBeInTheDocument())
    expect(createUrl).toHaveBeenCalled()
    expect(revokeUrl).toHaveBeenCalledWith('blob:project-export')
    createUrl.mockRestore()
    revokeUrl.mockRestore()
  })

  it('clears selection with Escape and keeps Delete/Backspace non-destructive', () => {
    useEditorStore.getState().setSelection({ elementId: 'task-bird', componentId: 'Home.TaskRow', frame: { x: 10, y: 20, width: 120, height: 64 }, editableProperties: ['width'] })
    render(<App />)
    expect(screen.getByTestId('selection-summary')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Delete' })
    expect(useEditorStore.getState().selectedElement).toBeDefined()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useEditorStore.getState().selectedElement).toBeUndefined()
  })

  it('supports guarded project replacement and preserves the current project on cancel', () => {
    const project = createBlankProject()
    useEditorStore.getState().commitProject({ ...project, changes: [{ id: 'change-guard', screenId: 'home', stateId: 'normal', elementId: 'item', componentId: 'component', property: 'width', before: 10, after: 20, valueType: 'visual', updatedAt: '2026-01-01T00:00:00.000Z' }] })
    const before = useEditorStore.getState().currentProject
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Import Mockup' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Current edits will be replaced')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useEditorStore.getState().currentProject).toEqual(before)
  })

  it('shows invalid Inspector feedback, cancels drafts with Escape, and handles undo in the shell', () => {
    const project = createBlankProject()
    project.screens = [{ id: 'home', name: 'Home', route: '/home', states: [{ id: 'normal', name: 'Normal' }] }]
    project.components = [{ id: 'Home.TaskRow', name: 'Task Row', type: 'row', selector: '[data-row]', instances: 'single', editableProperties: ['width'] }]
    project.editor = { currentScreenId: 'home', currentStateId: 'normal' }
    useEditorStore.getState().replaceProject(project)
    useEditorStore.getState().setSelection({ elementId: 'task-bird', componentId: 'Home.TaskRow', frame: { x: 10, y: 20, width: 120, height: 64 }, editableProperties: ['width'] })
    render(<App />)
    const width = screen.getByLabelText('W')
    fireEvent.change(width, { target: { value: '-1' } })
    fireEvent.blur(width)
    expect(screen.getByText('Invalid value')).toBeInTheDocument()
    expect(useEditorStore.getState().currentProject.changes).toHaveLength(0)
    fireEvent.focus(width)
    fireEvent.change(width, { target: { value: '180' } })
    fireEvent.keyDown(width, { key: 'Escape' })
    expect(width).toHaveValue(120)
    expect(useEditorStore.getState().currentProject.changes).toHaveLength(0)
    fireEvent.focus(width)
    fireEvent.change(width, { target: { value: '180' } })
    fireEvent.keyDown(width, { key: 'Enter' })
    fireEvent.blur(width)
    expect(useEditorStore.getState().currentProject.changes).toHaveLength(1)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(useEditorStore.getState().currentProject.changes).toHaveLength(0)
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true })
    expect(useEditorStore.getState().currentProject.changes).toHaveLength(1)
  })

  it('renders only Adapter-editable Inspector fields and commits one history entry', () => {
    const project = createBlankProject()
    project.screens = [{ id: 'home', name: 'Home', route: '/home', states: [{ id: 'normal', name: 'Normal' }] }]
    project.components = [{
      id: 'Home.TaskRow', name: 'Task Row', type: 'row', selector: '[data-row]', instances: 'single',
      editableProperties: ['width', 'background'],
    }]
    project.editor = { currentScreenId: 'home', currentStateId: 'normal' }
    useEditorStore.getState().replaceProject(project)
    useEditorStore.getState().setSelection({
      elementId: 'task-bird',
      componentId: 'Home.TaskRow',
      frame: { x: 10, y: 20, width: 120, height: 64 },
      editableProperties: ['width', 'background'],
      styles: { padding: 0, margin: 0, gap: 0, fontSize: 16, fontWeight: 400, lineHeight: 19.2, color: '#000000', background: '#ffffff', border: 'none', borderRadius: 0, opacity: 1 },
    })
    render(<App />)

    expect(screen.getByLabelText('W')).toBeEnabled()
    expect(screen.getByLabelText('Background')).toBeEnabled()
    expect(screen.queryByLabelText('X')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Font Size')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('W'), { target: { value: '180' } })
    fireEvent.blur(screen.getByLabelText('W'))
    expect(useEditorStore.getState().currentProject.changes).toHaveLength(1)
    expect(useEditorStore.getState().currentProject.changes[0]).toMatchObject({ property: 'width', after: 180, valueType: 'visual' })
    expect(useEditorStore.getState().past).toHaveLength(1)

    useEditorStore.getState().undo()
    expect(useEditorStore.getState().currentProject.changes).toHaveLength(0)
    useEditorStore.getState().redo()
    expect(useEditorStore.getState().currentProject.changes[0].after).toBe(180)
  })

  it('preserves fractional geometry in inputs and supports fractional Undo/Redo', () => {
    const project = createBlankProject()
    project.screens = [{ id: 'home', name: 'Home', route: '/home', states: [{ id: 'normal', name: 'Normal' }] }]
    project.components = [{ id: 'Home.TaskRow', name: 'Task Row', type: 'row', selector: '[data-row]', instances: 'single', editableProperties: ['position', 'width', 'height'] }]
    project.editor = { currentScreenId: 'home', currentStateId: 'normal' }
    useEditorStore.getState().replaceProject(project)
    useEditorStore.getState().setSelection({
      elementId: 'task-bird', componentId: 'Home.TaskRow',
      frame: { x: 104.5, y: 182.25, width: 206.5, height: 72.75 },
      editableProperties: ['position', 'width', 'height'],
    })
    render(<App />)

    expect(screen.getByLabelText('X', { exact: true })).toHaveValue(104.5)
    expect(screen.getByLabelText('W', { exact: true })).toHaveValue(206.5)
    fireEvent.blur(screen.getByLabelText('X', { exact: true }))
    fireEvent.blur(screen.getByLabelText('W', { exact: true }))
    expect(useEditorStore.getState().currentProject.changes).toHaveLength(0)

    fireEvent.change(screen.getByLabelText('X', { exact: true }), { target: { value: '120.25' } })
    fireEvent.blur(screen.getByLabelText('X', { exact: true }))
    expect(useEditorStore.getState().currentProject.changes[0]).toMatchObject({
      property: 'position', before: { x: 104.5, y: 182.25 }, after: { x: 120.25, y: 182.25 }, valueType: 'visual',
    })
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().currentProject.changes).toHaveLength(0)
    useEditorStore.getState().redo()
    expect(useEditorStore.getState().currentProject.changes[0].after).toMatchObject({ x: 120.25, y: 182.25 })
  })
})
