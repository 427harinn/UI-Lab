import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import App from './App'
import { createBlankProject } from './features/project/blankProject'
import { useEditorStore } from './features/project/store'

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

  it('shows a readable error for an invalid import', async () => {
    render(<App />)
    const input = screen.getByLabelText('Mockup ZIP file')
    fireEvent.change(input, { target: { files: [new File(['not a zip'], 'broken.zip', { type: 'application/zip' })] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('not a readable ZIP archive')
    expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled()
  })
})
