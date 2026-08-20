export type EditorShortcut = 'undo' | 'redo' | 'clear-selection'

export function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object' || !('tagName' in target)) return false
  const element = target as HTMLElement
  if (typeof element.tagName !== 'string') return false
  const tagName = element.tagName.toLowerCase()
  return tagName === 'input'
    || tagName === 'textarea'
    || tagName === 'select'
    || element.isContentEditable
    || element.getAttribute('contenteditable') !== null
    || element.contentEditable === 'true'
}

export function getEditorShortcut(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'target' | 'defaultPrevented'>): EditorShortcut | undefined {
  if (event.defaultPrevented) return undefined
  if (isTextEditingTarget(event.target)) return undefined
  const modifier = event.ctrlKey || event.metaKey
  if ((event.key === 'z' || event.key === 'Z') && modifier) return event.shiftKey ? 'redo' : 'undo'
  if ((event.key === 'y' || event.key === 'Y') && event.ctrlKey && !event.metaKey && !event.shiftKey) return 'redo'
  if (event.key === 'Escape') return 'clear-selection'
  return undefined
}

export interface EditorShortcutActions {
  undo: () => void
  redo: () => void
  clearSelection: () => void
}

export function handleEditorShortcut(event: KeyboardEvent, actions: EditorShortcutActions): boolean {
  const shortcut = getEditorShortcut(event)
  if (!shortcut) return false
  event.preventDefault()
  event.stopPropagation()
  if (shortcut === 'undo') actions.undo()
  else if (shortcut === 'redo') actions.redo()
  else actions.clearSelection()
  return true
}
