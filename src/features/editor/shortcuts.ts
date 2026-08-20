export type EditorShortcut = 'undo' | 'redo' | 'clear-selection'

export function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()
  return tagName === 'input'
    || tagName === 'textarea'
    || tagName === 'select'
    || target.isContentEditable
    || target.getAttribute('contenteditable') !== null
    || target.contentEditable === 'true'
}

export function getEditorShortcut(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'target'>): EditorShortcut | undefined {
  if (isTextEditingTarget(event.target)) return undefined
  const modifier = event.ctrlKey || event.metaKey
  if ((event.key === 'z' || event.key === 'Z') && modifier) return event.shiftKey ? 'redo' : 'undo'
  if ((event.key === 'y' || event.key === 'Y') && event.ctrlKey && !event.metaKey && !event.shiftKey) return 'redo'
  if (event.key === 'Escape') return 'clear-selection'
  return undefined
}
