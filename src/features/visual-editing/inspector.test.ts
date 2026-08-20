import { beforeEach, describe, expect, it } from 'vitest'
import { createBlankProject } from '../project/blankProject'
import {
  clampOpacity,
  cssColorToHex,
  getInspectorPropertyValueType,
  parseCssNumber,
  parseInspectorNumber,
  readComputedStyleSnapshot,
} from './inspector'
import {
  applyInspectorStyleOverrides,
  createStyleChange,
  upsertChange,
  resolveInspectorStyles,
} from './changes'

describe('Inspector property model', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('reads serializable computed style values from the target', () => {
    const element = document.createElement('div')
    element.style.cssText = 'padding: 12px; margin: 4px; gap: 8px; font-size: 18px; font-weight: 600; line-height: 24px; color: rgb(48, 53, 49); background: rgb(255, 255, 255); border: 1px solid rgb(229, 231, 226); border-radius: 12px; opacity: 0.8;'
    document.body.appendChild(element)

    expect(readComputedStyleSnapshot(element)).toMatchObject({
      padding: 12,
      margin: 4,
      gap: 8,
      fontSize: 18,
      fontWeight: 600,
      lineHeight: 24,
      color: '#303531',
      background: '#ffffff',
      borderRadius: 12,
      opacity: 0.8,
    })
  })

  it('classifies visual geometry and exact styles', () => {
    expect(getInspectorPropertyValueType('position')).toBe('visual')
    expect(getInspectorPropertyValueType('width')).toBe('visual')
    expect(getInspectorPropertyValueType('fontSize')).toBe('exact')
    expect(getInspectorPropertyValueType('background')).toBe('exact')
  })

  it('validates numbers and clamps opacity', () => {
    expect(parseInspectorNumber('width', '0')).toBeUndefined()
    expect(parseInspectorNumber('fontSize', '0')).toBeUndefined()
    expect(parseInspectorNumber('borderRadius', '-1')).toBeUndefined()
    expect(parseInspectorNumber('padding', 'nope')).toBeUndefined()
    expect(parseInspectorNumber('opacity', '2')).toBe(1)
    expect(parseInspectorNumber('opacity', '-1')).toBe(0)
    expect(clampOpacity(Number.NaN)).toBeNaN()
    expect(parseCssNumber('24px')).toBe(24)
    expect(cssColorToHex('rgb(48, 53, 49)')).toBe('#303531')
  })

  it('creates style changes and resolves the latest same-property change', () => {
    const project = createBlankProject()
    const first = createStyleChange('home', 'normal', 'task', 'Home.TaskRow', 'fontSize', 14, 16)
    const second = createStyleChange('home', 'normal', 'task', 'Home.TaskRow', 'fontSize', 16, 18)
    const changes = upsertChange(upsertChange([], first), second)
    project.changes = changes

    expect(project.changes).toHaveLength(1)
    expect(project.changes[0]).toMatchObject({ property: 'fontSize', before: 16, after: 18, valueType: 'exact' })
    expect(resolveInspectorStyles(project, 'home', 'normal', 'task', {
      padding: 0, margin: 0, gap: 0, fontSize: 14, fontWeight: 400, lineHeight: 16,
      color: '#000000', background: '#ffffff', border: 'none', borderRadius: 0, opacity: 1,
    }).fontSize).toBe(18)
  })

  it('applies fontWeight without px and keeps it undoable as an exact style', () => {
    const element = document.createElement('div')
    element.style.fontWeight = '400'
    document.body.appendChild(element)
    const project = createBlankProject()
    project.changes = [createStyleChange('home', 'normal', 'task', 'Home.TaskRow', 'fontWeight', 400, 600)]

    applyInspectorStyleOverrides(element, { fontWeight: '400' }, project, 'home', 'normal', 'task', {
      padding: 0, margin: 0, gap: 0, fontSize: 16, fontWeight: 400, lineHeight: 19.2,
      color: '#000000', background: '#ffffff', border: 'none', borderRadius: 0, opacity: 1,
    })

    expect(element.style.fontWeight).toBe('600')
    expect(element.style.fontWeight).not.toContain('px')
    expect(project.changes[0]).toMatchObject({ property: 'fontWeight', before: 400, after: 600, valueType: 'exact' })
  })
})
