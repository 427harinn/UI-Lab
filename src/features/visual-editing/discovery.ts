import type { UiLabComponentDefinition } from '../../schemas/project'
import type { EditableElementTarget } from './model'

function getElementInstanceId(element: Element): string | undefined {
  const instanceId = element.getAttribute('data-uilab-id')
  return instanceId?.trim() || undefined
}

export function discoverEditableElements(
  document: Document,
  componentDefinitions: UiLabComponentDefinition[],
): EditableElementTarget[] {
  const discovered: EditableElementTarget[] = []
  const seen = new Set<HTMLElement>()

  for (const component of componentDefinitions) {
    if (!component.selector) continue

    let elements: NodeListOf<Element>
    try {
      elements = document.querySelectorAll(component.selector)
    } catch {
      continue
    }

    elements.forEach((element) => {
      if (element.nodeType !== 1) return
      const htmlElement = element as HTMLElement
      if (htmlElement.getAttribute('data-uilab-component') !== component.id) return
      const instanceId = getElementInstanceId(htmlElement)
      if (!instanceId || seen.has(htmlElement)) return
      seen.add(htmlElement)
      discovered.push({
        element: htmlElement,
        componentId: component.id,
        instanceId,
        editableProperties: [...component.editableProperties],
      })
    })
  }

  return discovered
}

export function findEditableTargetAtNode(
  node: EventTarget | null,
  targets: EditableElementTarget[],
): EditableElementTarget | undefined {
  if (!node || typeof node !== 'object' || !('nodeType' in node)) return undefined
  let current: Node | null = node as Node
  while (current) {
    const target = targets.find((candidate) => candidate.element === current)
    if (target) return target
    current = current.parentNode
  }
  return undefined
}
