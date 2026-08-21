import type { EditableProperty } from '../../schemas/adapter'
import type { UiChange } from '../../schemas/project'
import { createStyleChange } from './changes'
import type { EditableElementTarget } from './model'
import type { EditScope } from './scope'

export type FlowDragMode = 'spacing' | 'move'

export interface FlowDragDecision {
  mode: FlowDragMode
  property?: 'margin'
  subProperty?: 'margin-top'
  reason: string
}

function hasEditable(target: EditableElementTarget, property: EditableProperty): boolean {
  return target.editableProperties.includes(property)
}

/** Conservative M10 rule: only vertical flow targets with editable margin use spacing. */
export function detectFlowDragMode(
  target: EditableElementTarget,
  forceVisual = false,
): FlowDragDecision {
  if (forceVisual || !hasEditable(target, 'margin')) return { mode: 'move', reason: forceVisual ? 'modifier override' : 'margin is not Adapter-editable' }
  const element = target.element
  const parent = element.parentElement
  if (!parent) return { mode: 'move', reason: 'no layout parent' }
  const view = element.ownerDocument.defaultView
  const style = view?.getComputedStyle(element)
  const parentStyle = view?.getComputedStyle(parent)
  if (!style || !parentStyle) return { mode: 'move', reason: 'computed style unavailable' }
  const position = style.position
  const display = parentStyle.display
  const flexColumn = display === 'flex' && parentStyle.flexDirection === 'column'
  const gridFlow = display === 'grid' && Boolean(parentStyle.gridTemplateRows || parentStyle.gridAutoRows)
  const blockFlow = display === 'block' || display === 'flow-root' || display === 'inline-block'
  if (!['static', 'relative'].includes(position)) return { mode: 'move', reason: 'target is positioned outside normal flow' }
  if (!blockFlow && !flexColumn && !gridFlow) return { mode: 'move', reason: 'layout relationship is ambiguous' }
  return { mode: 'spacing', property: 'margin', subProperty: 'margin-top', reason: flexColumn ? 'vertical flex flow' : gridFlow ? 'grid flow' : 'block flow' }
}

export function createFlowSpacingChange(
  screenId: string,
  stateId: string | undefined,
  target: Pick<EditableElementTarget, 'instanceId' | 'componentId'>,
  before: number,
  after: number,
  scope: EditScope = 'instance',
  now?: string,
): UiChange {
  return createStyleChange(screenId, stateId, target.instanceId, target.componentId, 'margin', before, after, now, {
    scope,
    referenceInstanceId: target.instanceId,
    subProperty: 'margin-top',
  })
}

export function applyFlowSpacing(element: HTMLElement, value: number): void {
  element.style.marginTop = `${value}px`
}
