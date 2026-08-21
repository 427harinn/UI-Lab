export const EDITOR_OWNED_ATTRIBUTE = 'data-uilab-editor-overlay'

function nodeIsEditorOwned(node: Node | null): boolean {
  if (!node) return false
  if (node.nodeType === 1) {
    return (node as Element).hasAttribute(EDITOR_OWNED_ATTRIBUTE)
      || Boolean((node as Element).closest(`[${EDITOR_OWNED_ATTRIBUTE}]`))
  }
  return node.parentElement ? nodeIsEditorOwned(node.parentElement) : false
}

export function shouldRediscoverMutations(records: MutationRecord[]): boolean {
  return records.some((record) => {
    if (record.type !== 'childList' || nodeIsEditorOwned(record.target)) return false
    return [...record.addedNodes, ...record.removedNodes].some((node) => !nodeIsEditorOwned(node))
  })
}

export interface DiscoveryScheduler {
  scheduleRediscovery: () => void
  cleanupDiscovery: () => void
}

export function createDiscoveryScheduler(discoverTargets: () => void): DiscoveryScheduler {
  let scheduledFrame: number | undefined
  let scheduledTimeout: number | undefined
  let disposed = false

  const scheduleRediscovery = () => {
    if (disposed || scheduledFrame !== undefined || scheduledTimeout !== undefined) return
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      scheduledFrame = window.requestAnimationFrame(() => {
        scheduledFrame = undefined
        if (!disposed) discoverTargets()
      })
      return
    }
    scheduledTimeout = window.setTimeout(() => {
      scheduledTimeout = undefined
      if (!disposed) discoverTargets()
    }, 0)
  }

  const cleanupDiscovery = () => {
    disposed = true
    if (scheduledFrame !== undefined && typeof window !== 'undefined') window.cancelAnimationFrame(scheduledFrame)
    if (scheduledTimeout !== undefined && typeof window !== 'undefined') window.clearTimeout(scheduledTimeout)
    scheduledFrame = undefined
    scheduledTimeout = undefined
  }

  return { scheduleRediscovery, cleanupDiscovery }
}
