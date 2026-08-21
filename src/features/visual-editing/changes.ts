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
import { changeAppliesToTarget, scopedChangeKey } from './scope'

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

function changesForElement(project: UiLabProject, screenId: string, stateId: string | undefined, elementId: string, componentId?: string): UiChange[] {
  return project.changes.filter((change) => (
    componentId
      ? changeAppliesToTarget(change, screenId, stateId, { componentId, instanceId: elementId })
      : change.screenId === screenId
        && change.elementId === elementId
        && (change.stateId === undefined || change.stateId === stateId)
  ))
}

function sameScope(change: UiChange, next: UiChange): boolean {
  return scopedChangeKey(change) === scopedChangeKey(next)
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
  componentId?: string,
): VisualFrame {
  return changesForElement(project, screenId, stateId, elementId, componentId).reduce((frame, change) => {
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
  options?: { scope?: 'instance' | 'component'; referenceInstanceId?: string },
): UiChange {
  return {
    id: crypto.randomUUID(),
    screenId,
    stateId,
    elementId,
    componentId,
    ...(options?.scope === 'component' ? { scope: 'component' as const, referenceInstanceId: options.referenceInstanceId ?? elementId } : {}),
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
  options?: { scope?: 'instance' | 'component'; referenceInstanceId?: string },
): UiChange {
  return {
    id: crypto.randomUUID(),
    screenId,
    stateId,
    elementId,
    componentId,
    ...(options?.scope === 'component' ? { scope: 'component' as const, referenceInstanceId: options.referenceInstanceId ?? elementId } : {}),
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
  options?: { scope?: 'instance' | 'component'; referenceInstanceId?: string; subProperty?: string },
): UiChange {
  return {
    id: crypto.randomUUID(),
    screenId,
    stateId,
    elementId,
    componentId,
    ...(options?.scope === 'component' ? { scope: 'component' as const, referenceInstanceId: options.referenceInstanceId ?? elementId } : {}),
    ...(options?.subProperty ? { subProperty: options.subProperty } : {}),
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
  componentId?: string,
): InspectorStyleSnapshot {
  return changesForElement(project, screenId, stateId, elementId, componentId)
    .filter((change) => inspectorStyleProperties.includes(change.property as InspectorStyleProperty))
    .reduce((styles, change) => mergeInspectorStyles(styles, change.property as InspectorStyleProperty, change.after), { ...baseStyles })
}

function styleChangeExists(project: UiLabProject, screenId: string, stateId: string | undefined, elementId: string, property: InspectorStyleProperty, componentId?: string): UiChange | undefined {
  return project.changes.find((change) => (
    change.property === property
      && (componentId
        ? changeAppliesToTarget(change, screenId, stateId, { componentId, instanceId: elementId })
        : change.screenId === screenId && change.elementId === elementId && (change.stateId === undefined || change.stateId === stateId))
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
  componentId?: string,
): InspectorStyleSnapshot {
  const styles = resolveInspectorStyles(project, screenId, stateId, elementId, baseStyles, componentId)
  for (const property of inspectorStyleProperties) {
    const cssName = cssPropertyName(property)
    const change = styleChangeExists(project, screenId, stateId, elementId, property, componentId)
    if (change) {
      const value = styles[property]
      const isUnitless = property === 'fontWeight' || property === 'opacity'
      const cssValue = property === 'opacity'
        ? String(clampOpacity(Number(value)))
        : typeof value === 'number' && !isUnitless ? `${value}px` : String(value)
      element.style.setProperty(change.subProperty ?? cssName, cssValue)
    } else if (baseInlineStyles[property]) {
      element.style.setProperty(cssName, baseInlineStyles[property] ?? '')
      if (property === 'margin') element.style.removeProperty('margin-top')
    } else {
      element.style.removeProperty(cssName)
      if (property === 'margin') element.style.removeProperty('margin-top')
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
