import type { UiChange, UiLabProject } from '../../schemas/project'
import type { EditableElementTarget, SelectedElementSnapshot } from './model'

export type EditScope = 'instance' | 'component'

export function effectiveChangeScope(change: Pick<UiChange, 'scope'>): EditScope {
  return change.scope ?? 'instance'
}

export function canUseComponentScope(
  project: UiLabProject,
  componentId: string,
  targetCount = 0,
): boolean {
  const component = project.components.find((candidate) => candidate.id === componentId)
  return component?.instances === 'multiple' && targetCount > 0
}

export function resolveEditTargets(
  targets: EditableElementTarget[],
  selection: Pick<SelectedElementSnapshot, 'componentId' | 'elementId'>,
  scope: EditScope,
): EditableElementTarget[] {
  if (scope === 'component') return targets.filter((target) => target.componentId === selection.componentId)
  return targets.filter((target) => target.componentId === selection.componentId && target.instanceId === selection.elementId)
}

export function changeAppliesToTarget(
  change: UiChange,
  screenId: string,
  stateId: string | undefined,
  target: Pick<EditableElementTarget, 'componentId' | 'instanceId'>,
): boolean {
  if (change.screenId !== screenId || (change.stateId !== undefined && change.stateId !== stateId)) return false
  if (effectiveChangeScope(change) === 'component') return change.componentId === target.componentId
  return change.elementId === target.instanceId
}

export function scopedChangeKey(change: Pick<UiChange, 'screenId' | 'stateId' | 'elementId' | 'componentId' | 'property' | 'scope'>): string {
  return effectiveChangeScope(change) === 'component'
    ? [change.screenId, change.stateId, change.componentId, change.property, 'component'].join('::')
    : [change.screenId, change.stateId, change.elementId, change.property, 'instance'].join('::')
}
