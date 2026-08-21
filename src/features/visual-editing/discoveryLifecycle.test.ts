import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDiscoveryScheduler, shouldRediscoverMutations } from './discoveryLifecycle'

describe('preview discovery lifecycle', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('coalesces repeated schedules into one animation-frame discovery', async () => {
    vi.useFakeTimers()
    const discover = vi.fn()
    const lifecycle = createDiscoveryScheduler(discover)

    lifecycle.scheduleRediscovery()
    lifecycle.scheduleRediscovery()
    lifecycle.scheduleRediscovery()
    expect(discover).not.toHaveBeenCalled()

    vi.runOnlyPendingTimers()
    expect(discover).toHaveBeenCalledTimes(1)
    lifecycle.cleanupDiscovery()
  })

  it('cancels a scheduled discovery during cleanup', () => {
    vi.useFakeTimers()
    const discover = vi.fn()
    const lifecycle = createDiscoveryScheduler(discover)
    lifecycle.scheduleRediscovery()
    lifecycle.cleanupDiscovery()
    vi.runOnlyPendingTimers()
    expect(discover).not.toHaveBeenCalled()
  })

  it('ignores mutations owned by the editor overlay', () => {
    const document = window.document
    document.body.innerHTML = '<main><div data-uilab-component="Card" data-uilab-id="one"></div></main>'
    const main = document.querySelector('main')!
    const overlay = document.createElement('div')
    overlay.setAttribute('data-uilab-editor-overlay', 'true')
    const overlayChild = document.createElement('div')
    overlay.appendChild(overlayChild)

    expect(shouldRediscoverMutations([
      { type: 'childList', target: main, addedNodes: [overlay], removedNodes: [] } as unknown as MutationRecord,
      { type: 'childList', target: overlay, addedNodes: [overlayChild], removedNodes: [] } as unknown as MutationRecord,
    ])).toBe(false)
  })

  it('schedules non-editor target additions and removals', () => {
    const document = window.document
    const main = document.createElement('main')
    const target = document.createElement('div')
    main.appendChild(target)
    expect(shouldRediscoverMutations([
      { type: 'childList', target: main, addedNodes: [target], removedNodes: [] } as unknown as MutationRecord,
    ])).toBe(true)
  })
})
