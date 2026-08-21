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

function InteractionModeStory({ mode }: { mode: 'select' | 'interact' }) {
  useEffect(() => {
    useEditorStore.getState().setInteractionMode(mode)
    return () => useEditorStore.getState().setInteractionMode('select')
  }, [mode])
  return <Toolbar />
}

export const SelectModeActive: Story = { render: () => <InteractionModeStory mode="select" /> }
export const InteractModeActive: Story = { render: () => <InteractionModeStory mode="interact" /> }

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

function ScopedInspectorStory({ mixed, scope = 'component' }: { mixed: boolean; scope?: 'instance' | 'component' }) {
  useEffect(() => {
    const project = createBlankProject()
    project.screens = [{ id: 'home', name: 'Home', route: '/home', states: [{ id: 'normal', name: 'Normal' }] }]
    project.editor = { currentScreenId: 'home', currentStateId: 'normal' }
    project.components = [{ id: 'Calendar.DayCell', name: 'Calendar.DayCell', type: 'component', selector: '[data-uilab-component="Calendar.DayCell"]', instances: 'multiple', editableProperties: ['height', 'background', 'padding', 'margin', 'gap', 'fontSize'] }]
    useEditorStore.getState().replaceProject(project)
    useEditorStore.getState().setSelection({
      elementId: 'day-1', componentId: 'Calendar.DayCell', frame: { x: 20, y: 20, width: 48, height: 56 },
      editableProperties: ['height', 'background', 'padding', 'margin', 'gap', 'fontSize'], componentInstanceCount: 7,
      selectionPath: [{ componentId: 'Calendar.Grid', instanceId: 'grid' }, { componentId: 'Calendar.DayCell', instanceId: 'day-1' }],
      scopeValues: { height: mixed ? 'Mixed' : 56, background: '#ffffff', padding: 4, margin: 0, gap: 2, fontSize: 14 },
      styles: { padding: 4, margin: 0, gap: 2, fontSize: 14, fontWeight: 400, lineHeight: 19.2, color: '#000000', background: '#ffffff', border: 'none', borderRadius: 4, opacity: 1 },
    })
    useEditorStore.getState().setEditScope(scope)
    return () => useEditorStore.getState().setEditScope('instance')
  }, [mixed, scope])
  return <InspectorPanel />
}

export const InspectorInstanceScope: Story = { render: () => <ScopedInspectorStory mixed={false} scope="instance" /> }
export const InspectorComponentScope: Story = { render: () => <ScopedInspectorStory mixed={false} /> }
export const InspectorMixedComponentValue: Story = { render: () => <ScopedInspectorStory mixed /> }

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
