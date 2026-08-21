import { describe, expect, it } from 'vitest'
import { createStyleChange, resolveInspectorStyles, upsertChange } from './changes'
import { changeAppliesToTarget, effectiveChangeScope, resolveEditTargets } from './scope'
import type { EditableElementTarget } from './model'
import { createBlankProject } from '../project/blankProject'

describe('edit scope', () => {
  it('defaults old changes to instance and groups component changes once', () => {
    const project = createBlankProject()
    project.screens = [{ id: 'home', name: 'Home', states: [{ id: 'normal', name: 'Normal' }] }]
    project.components = [{ id: 'Card', name: 'Card', type: 'Card', selector: '.card', instances: 'multiple', editableProperties: ['background'] }]
    const change = createStyleChange('home', 'normal', 'one', 'Card', 'background', '#fff', '#000', undefined, { scope: 'component', referenceInstanceId: 'one' })
    expect(effectiveChangeScope({})).toBe('instance')
    expect(change.scope).toBe('component')
    expect(changeAppliesToTarget(change, 'home', 'normal', { componentId: 'Card', instanceId: 'two' })).toBe(true)
    project.changes = upsertChange(project.changes, change)
    const base = { padding: 0, margin: 0, gap: 0, fontSize: 16, fontWeight: 400, lineHeight: 19, color: '#000', background: '#fff', border: 'none', borderRadius: 0, opacity: 1 }
    expect(resolveInspectorStyles(project, 'home', 'normal', 'two', base, 'Card').background).toBe('#000')
  })

  it('resolves instance or component targets without storing DOM nodes', () => {
    const elements = [document.createElement('div'), document.createElement('div')]
    const targets: EditableElementTarget[] = elements.map((element, index) => ({ element, componentId: 'Card', instanceId: String(index), editableProperties: ['background'] }))
    expect(resolveEditTargets(targets, { componentId: 'Card', elementId: '0' }, 'instance')).toHaveLength(1)
    expect(resolveEditTargets(targets, { componentId: 'Card', elementId: '0' }, 'component')).toHaveLength(2)
  })
})
