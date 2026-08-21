import { describe, expect, it } from 'vitest'
import { cycleSelectionCandidate, getSelectableAncestorsAtNode } from './selectionCandidates'
import type { EditableElementTarget } from './model'

function target(element: HTMLElement, componentId: string, instanceId: string): EditableElementTarget {
  return { element, componentId, instanceId, editableProperties: ['height'] }
}

describe('selection depth candidates', () => {
  it('orders nested Adapter targets outer to inner and cycles back', () => {
    const outer = document.createElement('section')
    const inner = document.createElement('div')
    const deep = document.createElement('span')
    outer.append(inner)
    inner.append(deep)
    const candidates = getSelectableAncestorsAtNode(deep, [target(deep, 'Deep', '3'), target(outer, 'Outer', '1'), target(inner, 'Inner', '2')])
    expect(candidates.map((item) => item.componentId)).toEqual(['Outer', 'Inner', 'Deep'])
    let cycle = cycleSelectionCandidate(candidates, undefined, undefined, { x: 10, y: 10 }, undefined)
    expect(cycle.target?.componentId).toBe('Outer')
    cycle = cycleSelectionCandidate(candidates, cycle.key, cycle.index, { x: 10, y: 10 }, cycle.point)
    expect(cycle.target?.componentId).toBe('Inner')
    cycle = cycleSelectionCandidate(candidates, cycle.key, cycle.index, { x: 10, y: 10 }, cycle.point)
    expect(cycle.target?.componentId).toBe('Deep')
    cycle = cycleSelectionCandidate(candidates, cycle.key, cycle.index, { x: 10, y: 10 }, cycle.point)
    expect(cycle.target?.componentId).toBe('Outer')
  })

  it('resets when the pointer moves beyond tolerance or candidates change', () => {
    const one = document.createElement('div')
    const two = document.createElement('div')
    const candidates = [target(one, 'One', '1'), target(two, 'Two', '2')]
    const first = cycleSelectionCandidate(candidates, undefined, undefined, { x: 1, y: 1 }, undefined)
    const moved = cycleSelectionCandidate(candidates, first.key, first.index, { x: 20, y: 1 }, first.point)
    expect(moved.index).toBe(0)
    const changed = cycleSelectionCandidate([candidates[1]], first.key, first.index, { x: 1, y: 1 }, first.point)
    expect(changed.index).toBe(0)
  })
})
