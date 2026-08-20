import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { EditorShell } from './EditorShell'
import { Toolbar } from './Toolbar'
import { ConfirmationDialog } from './ConfirmationDialog'
import { InspectorPanel } from '../panels/InspectorPanel'
import { createBlankProject } from '../../features/project/blankProject'
import { useEditorStore } from '../../features/project/store'

const meta = {
  title: 'UI Lab/Editor shell',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const BasicState: Story = { render: () => <EditorShell /> }

export const ToolbarOnly: Story = { render: () => <Toolbar /> }

export const InspectorEmpty: Story = { render: () => <InspectorPanel /> }

function SelectedInspector() {
  useEffect(() => {
    const project = createBlankProject()
    project.screens = [{ id: 'home', name: 'Home', route: '/home', states: [{ id: 'normal', name: 'Normal' }] }]
    project.editor = { currentScreenId: 'home', currentStateId: 'normal' }
    useEditorStore.getState().replaceProject(project)
    useEditorStore.getState().setSelection({
      elementId: 'task-bird',
      componentId: 'Home.TaskRow',
      frame: { x: 48.5, y: 120.25, width: 180, height: 72 },
      editableProperties: ['position', 'width', 'height', 'fontSize', 'fontWeight', 'background', 'opacity'],
      styles: { padding: 12, margin: 0, gap: 8, fontSize: 16, fontWeight: 400, lineHeight: 19.2, color: '#ffffff', background: '#5874d8', border: 'none', borderRadius: 12, opacity: 1 },
    })
  }, [])
  return <InspectorPanel />
}

export const InspectorSelected: Story = { render: () => <SelectedInspector /> }

export const StatusAndToast: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, padding: 32, background: '#15181e' }}>
      <span className="status-message status-message--success">Project exported</span>
      <span className="status-message status-message--error">Screenshot error. Preview capture failed.</span>
    </div>
  ),
}

export const Confirmation: Story = {
  render: () => <ConfirmationDialog title="Replace current project?" message="Current edits will be replaced. Continue?" onCancel={() => undefined} onContinue={() => undefined} />,
}
