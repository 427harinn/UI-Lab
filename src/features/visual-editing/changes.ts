import type { UiChange, UiLabProject } from '../../schemas/project'
import type { InspectorStyleProperty, InspectorStyleSnapshot, InlineStyleSnapshot } from './inspector'
import {
  clampOpacity,
  cssPropertyName,
  getInspectorPropertyValueType,
  inspectorStyleProperties,
  mergeInspectorStyles,
} from './inspector'
import type { VisualFrame } from './model'

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function readPosition(value: unknown): Partial<Pick<VisualFrame, 'x' | 'y'>> {
  if (!value || typeof value !== 'object') return {}
  const position = value as Record<string, unknown>
  return {
    ...(isNumber(position.x) ? { x: position.x } : {}),
    ...(isNumber(position.y) ? { y: position.y } : {}),
  }
}

function changesForElement(project: UiLabProject, screenId: string, stateId: string | undefined, elementId: string): UiChange[] {
  return project.changes.filter((change) => (
    change.screenId === screenId
    && change.elementId === elementId
    && (change.stateId === undefined || change.stateId === stateId)
  ))
}

function sameScope(change: UiChange, next: UiChange): boolean {
  return change.screenId === next.screenId
    && change.stateId === next.stateId
    && change.elementId === next.elementId
    && change.property === next.property
}

export function upsertChange(changes: UiChange[], nextChange: UiChange): UiChange[] {
  const index = changes.findIndex((change) => sameScope(change, nextChange))
  if (index < 0) return [...changes, nextChange]
  return changes.map((change, changeIndex) => changeIndex === index ? nextChange : change)
}

export function resolveVisualFrame(
  project: UiLabProject,
  screenId: string,
  stateId: string | undefined,
  elementId: string,
  baseFrame: VisualFrame,
): VisualFrame {
  return changesForElement(project, screenId, stateId, elementId).reduce((frame, change) => {
    if (change.property === 'position') return { ...frame, ...readPosition(change.after) }
    if (change.property === 'width' && isNumber(change.after)) return { ...frame, width: Math.max(1, change.after) }
    if (change.property === 'height' && isNumber(change.after)) return { ...frame, height: Math.max(1, change.after) }
    return frame
  }, { ...baseFrame })
}

export function createPositionChange(
  screenId: string,
  stateId: string | undefined,
  elementId: string,
  componentId: string,
  before: VisualFrame,
  after: VisualFrame,
  now = new Date().toISOString(),
): UiChange {
  return {
    id: crypto.randomUUID(),
    screenId,
    stateId,
    elementId,
    componentId,
    property: 'position',
    before: { x: before.x, y: before.y },
    after: { x: after.x, y: after.y },
    valueType: 'visual',
    updatedAt: now,
  }
}

export function createDimensionChange(
  screenId: string,
  stateId: string | undefined,
  elementId: string,
  componentId: string,
  property: 'width' | 'height',
  before: number,
  after: number,
  now = new Date().toISOString(),
): UiChange {
  return {
    id: crypto.randomUUID(),
    screenId,
    stateId,
    elementId,
    componentId,
    property,
    before,
    after,
    valueType: 'visual',
    updatedAt: now,
  }
}

export function createStyleChange(
  screenId: string,
  stateId: string | undefined,
  elementId: string,
  componentId: string,
  property: InspectorStyleProperty,
  before: number | string,
  after: number | string,
  now = new Date().toISOString(),
): UiChange {
  return {
    id: crypto.randomUUID(),
    screenId,
    stateId,
    elementId,
    componentId,
    property,
    before,
    after: property === 'opacity' && typeof after === 'number' ? clampOpacity(after) : after,
    valueType: getInspectorPropertyValueType(property),
    updatedAt: now,
  }
}

export function resolveInspectorStyles(
  project: UiLabProject,
  screenId: string,
  stateId: string | undefined,
  elementId: string,
  baseStyles: InspectorStyleSnapshot,
): InspectorStyleSnapshot {
  return changesForElement(project, screenId, stateId, elementId)
    .filter((change) => inspectorStyleProperties.includes(change.property as InspectorStyleProperty))
    .reduce((styles, change) => mergeInspectorStyles(styles, change.property as InspectorStyleProperty, change.after), { ...baseStyles })
}

function styleChangeExists(project: UiLabProject, screenId: string, stateId: string | undefined, elementId: string, property: InspectorStyleProperty): boolean {
  return project.changes.some((change) => (
    change.screenId === screenId
    && change.elementId === elementId
    && change.property === property
    && (change.stateId === undefined || change.stateId === stateId)
  ))
}

export function applyInspectorStyleOverrides(
  element: HTMLElement,
  baseInlineStyles: InlineStyleSnapshot,
  project: UiLabProject,
  screenId: string,
  stateId: string | undefined,
  elementId: string,
  baseStyles: InspectorStyleSnapshot,
): InspectorStyleSnapshot {
  const styles = resolveInspectorStyles(project, screenId, stateId, elementId, baseStyles)
  for (const property of inspectorStyleProperties) {
    const cssName = cssPropertyName(property)
    if (styleChangeExists(project, screenId, stateId, elementId, property)) {
      const value = styles[property]
      const isUnitless = property === 'fontWeight' || property === 'opacity'
      const cssValue = property === 'opacity'
        ? String(clampOpacity(Number(value)))
        : typeof value === 'number' && !isUnitless ? `${value}px` : String(value)
      element.style.setProperty(cssName, cssValue)
    } else if (baseInlineStyles[property]) {
      element.style.setProperty(cssName, baseInlineStyles[property] ?? '')
    } else {
      element.style.removeProperty(cssName)
    }
  }
  return styles
}

export function applyVisualFrame(
  element: HTMLElement,
  baseFrame: VisualFrame,
  frame: VisualFrame,
): void {
  const baseTransform = element.dataset.uilabBaseTransform ?? ''
  const deltaX = frame.x - baseFrame.x
  const deltaY = frame.y - baseFrame.y
  const translate = deltaX || deltaY ? `translate(${deltaX}px, ${deltaY}px)` : ''
  element.style.transform = [translate, baseTransform].filter(Boolean).join(' ')

  if (frame.width !== baseFrame.width) {
    element.style.width = `${frame.width}px`
    element.dataset.uilabWidthEdited = 'true'
  } else {
    element.style.width = element.dataset.uilabBaseWidth ?? ''
    delete element.dataset.uilabWidthEdited
  }
  if (frame.height !== baseFrame.height) {
    element.style.height = `${frame.height}px`
    element.dataset.uilabHeightEdited = 'true'
  } else {
    element.style.height = element.dataset.uilabBaseHeight ?? ''
    delete element.dataset.uilabHeightEdited
  }
}

export function captureBaseStyles(element: HTMLElement): void {
  if (element.dataset.uilabBaseTransform === undefined) element.dataset.uilabBaseTransform = element.style.transform
  if (element.dataset.uilabBaseWidth === undefined) element.dataset.uilabBaseWidth = element.style.width
  if (element.dataset.uilabBaseHeight === undefined) element.dataset.uilabBaseHeight = element.style.height
}
