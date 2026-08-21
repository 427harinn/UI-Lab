import type { EditableElementTarget } from './model'

export const SELECTION_CLICK_TOLERANCE = 8

function isNode(value: EventTarget | null): value is Node {
  return Boolean(value && typeof value === 'object' && 'nodeType' in value)
}

/** Returns only Adapter targets on the clicked node's ancestry, outermost first. */
export function getSelectableAncestorsAtNode(
  node: EventTarget | null,
  targets: EditableElementTarget[],
): EditableElementTarget[] {
  if (!isNode(node)) return []
  const targetByElement = new Map(targets.map((target) => [target.element, target]))
  const candidates: EditableElementTarget[] = []
  let current: Node | null = node
  while (current) {
    const target = targetByElement.get(current as HTMLElement)
    if (target) candidates.unshift(target)
    current = current.parentNode
  }
  return candidates
}

export function selectionCandidateKey(candidates: EditableElementTarget[]): string {
  return candidates.map((candidate) => `${candidate.componentId}::${candidate.instanceId}`).join('|')
}

export function orderSelectionCandidates(candidates: EditableElementTarget[]): EditableElementTarget[] {
  return [...candidates]
}

export function cycleSelectionCandidate(
  candidates: EditableElementTarget[],
  previousKey: string | undefined,
  previousIndex: number | undefined,
  point: { x: number; y: number },
  previousPoint: { x: number; y: number } | undefined,
): { target?: EditableElementTarget; key: string; index: number; point: { x: number; y: number } } {
  const key = selectionCandidateKey(candidates)
  const moved = !previousPoint
    || Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y) > SELECTION_CLICK_TOLERANCE
  const sameCycle = !moved && previousKey === key
  const index = candidates.length === 0 ? -1 : sameCycle ? ((previousIndex ?? -1) + 1) % candidates.length : 0
  return { target: index >= 0 ? candidates[index] : undefined, key, index, point }
}
