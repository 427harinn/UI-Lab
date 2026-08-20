import { describe, expect, it, vi } from 'vitest'
import { getEditorShortcut, handleEditorShortcut, isTextEditingTarget } from './shortcuts'

function shortcut(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return { key: 'z', ctrlKey: false, metaKey: false, shiftKey: false, target: document.body, ...overrides } as KeyboardEvent
}

describe('editor shortcut boundary', () => {
  it('recognizes platform undo and redo shortcuts', () => {
    expect(getEditorShortcut(shortcut({ key: 'z', ctrlKey: true }))).toBe('undo')
    expect(getEditorShortcut(shortcut({ key: 'z', metaKey: true }))).toBe('undo')
    expect(getEditorShortcut(shortcut({ key: 'z', ctrlKey: true, shiftKey: true }))).toBe('redo')
    expect(getEditorShortcut(shortcut({ key: 'z', metaKey: true, shiftKey: true }))).toBe('redo')
    expect(getEditorShortcut(shortcut({ key: 'y', ctrlKey: true }))).toBe('redo')
  })

  it('does not steal native editing shortcuts from form controls', () => {
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const select = document.createElement('select')
    const editable = document.createElement('div')
    editable.contentEditable = 'true'
    expect(isTextEditingTarget(input)).toBe(true)
    expect(isTextEditingTarget(textarea)).toBe(true)
    expect(isTextEditingTarget(select)).toBe(true)
    expect(isTextEditingTarget(editable)).toBe(true)
    expect(getEditorShortcut(shortcut({ ctrlKey: true, target: input }))).toBeUndefined()
    expect(getEditorShortcut(shortcut({ key: 'Escape', target: textarea }))).toBeUndefined()
  })

  it('keeps unavailable and destructive keys as no-ops', () => {
    expect(getEditorShortcut(shortcut({ key: 'Delete' }))).toBeUndefined()
    expect(getEditorShortcut(shortcut({ key: 'Backspace' }))).toBeUndefined()
    expect(getEditorShortcut(shortcut({ key: 'z' }))).toBeUndefined()
    expect(getEditorShortcut(shortcut({ key: 'Escape' }))).toBe('clear-selection')
  })

  it('uses one action boundary and does not handle an already-consumed event', () => {
    const actions = { undo: vi.fn(), redo: vi.fn(), clearSelection: vi.fn() }
    const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })
    expect(handleEditorShortcut(event, actions)).toBe(true)
    expect(actions.undo).toHaveBeenCalledOnce()
    expect(actions.redo).not.toHaveBeenCalled()
    const alreadyConsumed = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })
    Object.defineProperty(alreadyConsumed, 'defaultPrevented', { value: true })
    expect(handleEditorShortcut(alreadyConsumed, actions)).toBe(false)
    expect(actions.undo).toHaveBeenCalledOnce()
  })
})
