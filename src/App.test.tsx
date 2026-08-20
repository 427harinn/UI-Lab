import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { createBlankProject } from './features/project/blankProject'
import { useEditorStore } from './features/project/store'

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
})
