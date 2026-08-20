import type { UiLabComponentDefinition, UiLabProject } from '../../schemas/project'
import type { InspectorStyleSnapshot } from './inspector'

export interface VisualFrame {
  x: number
  y: number
  width: number
  height: number
}

export interface EditableElementTarget {
  element: HTMLElement
  componentId: string
  instanceId: string
  editableProperties: string[]
}

export interface SelectedElementSnapshot {
  elementId: string
  componentId: string
  frame: VisualFrame
  editableProperties: string[]
  styles?: InspectorStyleSnapshot
}

export function canDragTarget(target: Pick<EditableElementTarget, 'editableProperties'>): boolean {
  return target.editableProperties.includes('position')
}

export function canResizeTarget(target: Pick<EditableElementTarget, 'editableProperties'>): boolean {
  return target.editableProperties.includes('width') || target.editableProperties.includes('height')
}

export function canResizeWidth(target: Pick<EditableElementTarget, 'editableProperties'>): boolean {
  return target.editableProperties.includes('width')
}

export function canResizeHeight(target: Pick<EditableElementTarget, 'editableProperties'>): boolean {
  return target.editableProperties.includes('height')
}

export function getResizeDirections(target: Pick<EditableElementTarget, 'editableProperties'>): string[] {
  const width = canResizeWidth(target)
  const height = canResizeHeight(target)
  const position = canDragTarget(target)

  if (width && height && position) return ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']
  if (width && height) return ['e', 's', 'se']
  if (width) return position ? ['w', 'e'] : ['e']
  if (height) return position ? ['n', 's'] : ['s']
  return []
}

export function normalizeRectToContentArea(
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
  scrollX = 0,
  scrollY = 0,
): VisualFrame {
  return {
    x: rect.left + scrollX,
    y: rect.top + scrollY,
    width: rect.width,
    height: rect.height,
  }
}

export function getElementFrame(element: HTMLElement): VisualFrame {
  const view = element.ownerDocument.defaultView
  return normalizeRectToContentArea(element.getBoundingClientRect(), view?.scrollX ?? 0, view?.scrollY ?? 0)
}

export function findComponentDefinition(
  project: UiLabProject,
  componentId: string,
): UiLabComponentDefinition | undefined {
  return project.components.find((component) => component.id === componentId)
}

export function framesDiffer(before: VisualFrame, after: VisualFrame): boolean {
  return before.x !== after.x
    || before.y !== after.y
    || before.width !== after.width
    || before.height !== after.height
}
