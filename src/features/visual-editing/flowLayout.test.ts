import { describe, expect, it } from 'vitest'
import { detectFlowDragMode } from './flowLayout'
import type { EditableElementTarget } from './model'

function fixture(css: string, parentCss: string, editableProperties = ['margin']): EditableElementTarget {
  const parent = document.createElement('div')
  parent.setAttribute('style', parentCss)
  const element = document.createElement('div')
  element.setAttribute('style', css)
  parent.append(element)
  document.body.append(parent)
  return { element, componentId: 'Target', instanceId: 'target', editableProperties }
}

describe('flow-aware drag detection', () => {
  it('uses margin-top for safe block and flex-column flow', () => {
    expect(detectFlowDragMode(fixture('position: static; margin: 4px', 'display: block')).mode).toBe('spacing')
    expect(detectFlowDragMode(fixture('position: relative', 'display: flex; flex-direction: column; gap: 8px')).property).toBe('margin')
  })

  it('falls back for absolute and ambiguous layouts', () => {
    expect(detectFlowDragMode(fixture('position: absolute', 'display: block')).mode).toBe('move')
    expect(detectFlowDragMode(fixture('position: static', 'display: flex; flex-direction: row')).mode).toBe('move')
    expect(detectFlowDragMode(fixture('position: static', 'display: block'), true).reason).toBe('modifier override')
  })
})
