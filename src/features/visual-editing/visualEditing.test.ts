import { beforeEach, describe, expect, it } from 'vitest'
import { discoverEditableElements, findEditableTargetAtNode } from './discovery'
import { resolveVisualFrame } from './changes'
import {
  canDragTarget,
  canResizeHeight,
  canResizeTarget,
  canResizeWidth,
  normalizeRectToContentArea,
} from './model'
import { createBlankProject } from '../project/blankProject'

describe('visual editing model', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('discovers only Adapter-declared elements and resolves component and instance ids', () => {
    document.body.innerHTML = `
      <section data-uilab-component="Home.TaskRow" data-uilab-id="task-bird"><span>Bird</span></section>
      <section data-uilab-component="Home.TaskRow"><span>Missing instance id</span></section>
      <section data-uilab-component="NotDeclared" data-uilab-id="ignored">Ignored</section>
    `
    const targets = discoverEditableElements(document, [{
      id: 'Home.TaskRow',
      name: 'Home.TaskRow',
      type: 'Home.TaskRow',
      selector: "[data-uilab-component='Home.TaskRow']",
      instances: 'multiple',
      editableProperties: ['position', 'width'],
    }])

    expect(targets).toHaveLength(1)
    expect(targets[0]).toMatchObject({ componentId: 'Home.TaskRow', instanceId: 'task-bird' })
    expect(findEditableTargetAtNode(targets[0].element.querySelector('span'), targets)).toBe(targets[0])
  })

  it('derives drag and resize capabilities from Adapter editable properties', () => {
    expect(canDragTarget({ editableProperties: ['position'] })).toBe(true)
    expect(canDragTarget({ editableProperties: ['width'] })).toBe(false)
    expect(canResizeTarget({ editableProperties: ['position'] })).toBe(false)
    expect(canResizeWidth({ editableProperties: ['width'] })).toBe(true)
    expect(canResizeHeight({ editableProperties: ['width'] })).toBe(false)
    expect(canResizeHeight({ editableProperties: ['height'] })).toBe(true)
  })

  it('normalizes iframe content coordinates with document scroll, without iframe offset', () => {
    expect(normalizeRectToContentArea({ left: 24, top: 48, width: 120, height: 64 }, 10, 12)).toEqual({
      x: 34,
      y: 60,
      width: 120,
      height: 64,
    })
  })

  it('resolves visual position and dimensions from committed changes', () => {
    const project = createBlankProject()
    project.screens = [{ id: 'home', name: 'Home', route: '/home', states: [{ id: 'normal', name: 'Normal' }] }]
    project.changes = [
      {
        id: 'move', screenId: 'home', stateId: 'normal', elementId: 'task-bird', componentId: 'Home.TaskRow',
        property: 'position', before: { x: 10, y: 20 }, after: { x: 42, y: 54 }, valueType: 'visual', updatedAt: new Date().toISOString(),
      },
      {
        id: 'resize', screenId: 'home', stateId: 'normal', elementId: 'task-bird', componentId: 'Home.TaskRow',
        property: 'width', before: 120, after: 180, valueType: 'visual', updatedAt: new Date().toISOString(),
      },
    ]

    expect(resolveVisualFrame(project, 'home', 'normal', 'task-bird', { x: 10, y: 20, width: 120, height: 64 })).toEqual({
      x: 42, y: 54, width: 180, height: 64,
    })
  })
})
