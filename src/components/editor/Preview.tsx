import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Moveable, { type OnDrag, type OnDragStart, type OnResize, type OnResizeStart } from 'react-moveable'
import { useEditorStore } from '../../features/project/store'
import { buildPreviewRoute, parsePreviewHash } from '../../features/mockup/route'
import { getScreenPath, type ImportedMockup } from '../../schemas/adapter'
import { discoverEditableElements } from '../../features/visual-editing/discovery'
import { EDITOR_OWNED_ATTRIBUTE, createDiscoveryScheduler, shouldRediscoverMutations } from '../../features/visual-editing/discoveryLifecycle'
import {
  canDragTarget,
  canResizeHeight,
  canResizeTarget,
  canResizeWidth,
  getElementFrame,
  getResizeDirections,
  type EditableElementTarget,
  type VisualFrame,
} from '../../features/visual-editing/model'
import {
  applyInspectorStyleOverrides,
  applyVisualFrame,
  captureBaseStyles,
  createDimensionChange,
  createPositionChange,
  resolveInspectorStyles,
  resolveVisualFrame,
  upsertChange,
} from '../../features/visual-editing/changes'
import { parseCssNumber, readComputedStyleSnapshot, readInlineStyleSnapshot } from '../../features/visual-editing/inspector'
import { applyFlowSpacing, detectFlowDragMode, type FlowDragDecision } from '../../features/visual-editing/flowLayout'
import { cycleSelectionCandidate, getSelectableAncestorsAtNode, orderSelectionCandidates } from '../../features/visual-editing/selectionCandidates'
import { createFlowSpacingChange } from '../../features/visual-editing/flowLayout'
import { captureIframeScreenshot } from '../../features/codex-export/screenshot'
import { registerPreviewCapture, previewScopeKey, type PreviewCaptureScope } from '../../features/codex-export/previewCapture'
import { handleEditorShortcut } from '../../features/editor/shortcuts'

interface InteractionState {
  type: 'drag' | 'resize'
  target: EditableElementTarget
  before: VisualFrame
  current: VisualFrame
  flow?: FlowDragDecision
  beforeMarginTop?: number
}

function sameFrame(first: VisualFrame, second: VisualFrame): boolean {
  return first.x === second.x
    && first.y === second.y
    && first.width === second.width
    && first.height === second.height
}

function frameFromDrag(start: VisualFrame, translate: number[]): VisualFrame {
  return {
    ...start,
    x: start.x + (translate[0] ?? 0),
    y: start.y + (translate[1] ?? 0),
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

function previewHashForScope(importedMockup: ImportedMockup, scope: PreviewCaptureScope): string {
  const screen = importedMockup.screens.find((item) => item.id === scope.screenId)
  if (!screen) throw new Error(`The Adapter screen “${scope.screenId}” is not available for screenshot capture.`)
  const route = buildPreviewRoute(importedMockup.entry, getScreenPath(screen), scope.stateId)
  const hashIndex = route.indexOf('#')
  return hashIndex >= 0 ? route.slice(hashIndex) : ''
}

function sameValue(first: unknown, second: unknown): boolean {
  return typeof first === typeof second && first === second
}

export function Preview() {
  const viewport = useEditorStore((state) => state.viewport)
  const project = useEditorStore((state) => state.currentProject)
  const importedMockup = useEditorStore((state) => state.importedMockup)
  const currentScreenId = useEditorStore((state) => state.currentScreenId)
  const currentStateId = useEditorStore((state) => state.currentStateId)
  const interactionMode = useEditorStore((state) => state.interactionMode)
  const selectedElement = useEditorStore((state) => state.selectedElement)
  const updateSelectionFrame = useEditorStore((state) => state.updateSelectionFrame)
  const setImportError = useEditorStore((state) => state.setImportError)
  const commitProject = useEditorStore((state) => state.commitProject)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const overlayRootRef = useRef<HTMLElement | null>(null)
  const moveableRef = useRef<Moveable | null>(null)
  const targetsRef = useRef<EditableElementTarget[]>([])
  const baseFramesRef = useRef(new WeakMap<HTMLElement, VisualFrame>())
  const baseInspectorStylesRef = useRef(new WeakMap<HTMLElement, ReturnType<typeof readComputedStyleSnapshot>>())
  const baseInlineStylesRef = useRef(new WeakMap<HTMLElement, ReturnType<typeof readInlineStyleSnapshot>>())
  const interactionRef = useRef<InteractionState | undefined>(undefined)
  const resizeListenersRef = useRef(new Map<HTMLElement, (event: PointerEvent) => void>())
  const interactionModeRef = useRef(interactionMode)
  const iframeClickCleanupRef = useRef<(() => void) | undefined>(undefined)
  const iframeShortcutCleanupRef = useRef<(() => void) | undefined>(undefined)
  const discoveryCleanupRef = useRef<(() => void) | undefined>(undefined)
  const activeResizeCleanupRef = useRef<(() => void) | undefined>(undefined)
  const [iframeDocument, setIframeDocument] = useState<Document | null>(null)
  const [overlayRoot, setOverlayRoot] = useState<HTMLElement | null>(null)
  const [targets, setTargets] = useState<EditableElementTarget[]>([])
  const [snapActive, setSnapActive] = useState(false)
  const [flowStatus, setFlowStatus] = useState<string | undefined>(undefined)
  const selectionCycleRef = useRef<{ key?: string; index: number; point?: { x: number; y: number } }>({ index: -1 })
  const discoveryKeyRef = useRef<string | undefined>(undefined)
  const suppressNextClickRef = useRef(false)

  useEffect(() => {
    interactionModeRef.current = interactionMode
  }, [interactionMode])

  useEffect(() => {
    const unregister = registerPreviewCapture(async (scopes: PreviewCaptureScope[]) => {
      if (!iframeRef.current?.contentDocument || !importedMockup) throw new Error('The preview is not available for screenshot capture.')
      const store = useEditorStore.getState()
      const originalScreenId = store.currentScreenId
      const originalStateId = store.currentStateId
      const screenshots: Record<string, Uint8Array> = {}

      const waitForScope = async (scope: PreviewCaptureScope) => {
        const expectedHash = previewHashForScope(importedMockup, scope)
        for (let attempt = 0; attempt < 80; attempt += 1) {
          const frame = iframeRef.current
          const hash = frame?.contentWindow?.location.hash ?? ''
          if (frame?.contentDocument?.readyState === 'complete' && hash === expectedHash) {
            await wait(40)
            for (const expected of scope.targets ?? []) {
              const found = targetsRef.current.some((target) => target.componentId === expected.componentId && target.instanceId === expected.instanceId)
              if (!found) throw new Error(`The preview does not contain instance “${expected.instanceId}” for component “${expected.componentId}”.`)
            }
            return
          }
          await wait(25)
        }
        throw new Error(`The preview did not become ready for ${scope.screenId}/${scope.stateId}.`)
      }

      try {
        for (const scope of scopes) {
          if (useEditorStore.getState().currentScreenId !== scope.screenId) useEditorStore.getState().setCurrentScreenId(scope.screenId)
          if (useEditorStore.getState().currentStateId !== scope.stateId) useEditorStore.getState().setCurrentStateId(scope.stateId)
          await waitForScope(scope)
          const frame = iframeRef.current
          if (!frame) throw new Error('The preview iframe disappeared during screenshot capture.')
          screenshots[previewScopeKey(scope)] = await captureIframeScreenshot(frame, viewport.width, viewport.height)
        }
      } finally {
        if (originalScreenId && useEditorStore.getState().currentScreenId !== originalScreenId) useEditorStore.getState().setCurrentScreenId(originalScreenId)
        if (originalStateId && useEditorStore.getState().currentStateId !== originalStateId) useEditorStore.getState().setCurrentStateId(originalStateId)
      }
      return screenshots
    })
    return unregister
  }, [importedMockup, viewport.height, viewport.width])

  const previewSource = useMemo(() => {
    if (!importedMockup || typeof URL.createObjectURL !== 'function') return undefined
    return URL.createObjectURL(new Blob([importedMockup.previewHtml], { type: 'text/html' }))
  }, [importedMockup])

  useEffect(() => () => {
    if (previewSource) URL.revokeObjectURL(previewSource)
  }, [previewSource])

  const selectedScreen = importedMockup?.screens.find((screen) => screen.id === currentScreenId)
  const route = importedMockup && selectedScreen && currentStateId
    ? buildPreviewRoute(previewSource ?? importedMockup.entry, getScreenPath(selectedScreen), currentStateId)
    : undefined
  const hasPersistedMockup = project.source.type === 'mockup' && !importedMockup
  const selectedTarget = selectedElement
    ? targets.find((target) => target.instanceId === selectedElement.elementId && target.componentId === selectedElement.componentId)
    : undefined

  const applyProjectChangesToTargets = useCallback((nextTargets: EditableElementTarget[]) => {
    const liveState = useEditorStore.getState()
    const liveProject = liveState.currentProject
    const liveScreenId = liveState.currentScreenId
    const liveStateId = liveState.currentStateId
    const liveSelection = liveState.selectedElement
    if (!liveScreenId) return
    for (const target of nextTargets) {
      captureBaseStyles(target.element)
      const baseFrame = baseFramesRef.current.get(target.element) ?? getElementFrame(target.element)
      baseFramesRef.current.set(target.element, baseFrame)
      const frame = resolveVisualFrame(liveProject, liveScreenId, liveStateId, target.instanceId, baseFrame, target.componentId)
      applyVisualFrame(target.element, baseFrame, frame)
      const baseStyles = baseInspectorStylesRef.current.get(target.element) ?? readComputedStyleSnapshot(target.element)
      const baseInlineStyles = baseInlineStylesRef.current.get(target.element) ?? readInlineStyleSnapshot(target.element)
      baseInspectorStylesRef.current.set(target.element, baseStyles)
      baseInlineStylesRef.current.set(target.element, baseInlineStyles)
      const styles = applyInspectorStyleOverrides(
        target.element,
        baseInlineStyles,
        liveProject,
        liveScreenId,
        liveStateId,
        target.instanceId,
        baseStyles,
        target.componentId,
      )
      if (liveSelection?.elementId === target.instanceId && liveSelection.componentId === target.componentId) {
        liveState.updateSelectionStyles(styles)
      }
    }
    if (liveSelection) {
      const selected = nextTargets.find((target) => target.instanceId === liveSelection.elementId && target.componentId === liveSelection.componentId)
      if (selected) {
        const baseFrame = baseFramesRef.current.get(selected.element) ?? getElementFrame(selected.element)
        liveState.updateSelectionFrame(resolveVisualFrame(liveProject, liveScreenId, liveStateId, selected.instanceId, baseFrame, selected.componentId))
      }
    }
  }, [])

  const reconcileSelection = useCallback((nextTargets: EditableElementTarget[]) => {
    const liveState = useEditorStore.getState()
    const liveSelection = liveState.selectedElement
    if (!liveSelection) return
    const replacement = nextTargets.find((target) => target.componentId === liveSelection.componentId && target.instanceId === liveSelection.elementId)
    if (!replacement) {
      liveState.setSelection(undefined)
      return
    }
    const baseFrame = baseFramesRef.current.get(replacement.element) ?? getElementFrame(replacement.element)
    const baseStyles = baseInspectorStylesRef.current.get(replacement.element) ?? readComputedStyleSnapshot(replacement.element)
    liveState.setSelection({
      ...liveSelection,
      editableProperties: replacement.editableProperties,
      frame: resolveVisualFrame(liveState.currentProject, liveState.currentScreenId ?? '', liveState.currentStateId, replacement.instanceId, baseFrame, replacement.componentId),
        styles: resolveInspectorStyles(liveState.currentProject, liveState.currentScreenId ?? '', liveState.currentStateId, replacement.instanceId, baseStyles, replacement.componentId),
    })
  }, [])

  const handleIframeLoad = useCallback(() => {
    const document = iframeRef.current?.contentDocument
    const window = iframeRef.current?.contentWindow
    if (!document || !window || !importedMockup) {
      setImportError('The preview loaded, but UI Lab cannot inspect its iframe DOM. Re-import a same-origin single-file preview.')
      return
    }

    discoveryCleanupRef.current?.()
    discoveryCleanupRef.current = undefined
    iframeClickCleanupRef.current?.()
    iframeClickCleanupRef.current = undefined
    iframeShortcutCleanupRef.current?.()
    iframeShortcutCleanupRef.current = undefined
    overlayRootRef.current?.remove()
    const nextRoot = document.createElement('div')
    nextRoot.className = 'uilab-editor-overlay'
    nextRoot.setAttribute('data-uilab-editor-overlay', 'true')
    nextRoot.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none;'
    document.body.appendChild(nextRoot)
    overlayRootRef.current = nextRoot
    const overlayStyle = document.createElement('style')
    overlayStyle.setAttribute(EDITOR_OWNED_ATTRIBUTE, 'true')
    overlayStyle.textContent = '.moveable-control-box, .moveable-control, .moveable-direction, .moveable-line { pointer-events: auto !important; }'
    document.head.appendChild(overlayStyle)
    const handleShortcut = (event: KeyboardEvent) => {
      handleEditorShortcut(event, {
        undo: () => useEditorStore.getState().undo(),
        redo: () => useEditorStore.getState().redo(),
        clearSelection: () => useEditorStore.getState().setSelection(undefined),
      })
    }
    document.addEventListener('keydown', handleShortcut)
    window.addEventListener('keydown', handleShortcut)
    iframeShortcutCleanupRef.current = () => {
      document.removeEventListener('keydown', handleShortcut)
      window.removeEventListener('keydown', handleShortcut)
    }
    baseFramesRef.current = new WeakMap()
    baseInspectorStylesRef.current = new WeakMap()
    baseInlineStylesRef.current = new WeakMap()
    selectionCycleRef.current = { index: -1 }
    discoveryKeyRef.current = undefined
    setFlowStatus(undefined)
    setIframeDocument(document)
    setOverlayRoot(nextRoot)
    useEditorStore.getState().setSelection(undefined)

    const rediscover = () => {
      if (iframeRef.current?.contentDocument !== document) return
      const liveState = useEditorStore.getState()
      const discovered = discoverEditableElements(document, liveState.currentProject.components)
      const nextKey = discovered.map((target) => `${target.componentId}::${target.instanceId}`).join('|')
      if (nextKey !== discoveryKeyRef.current) selectionCycleRef.current = { index: -1 }
      discoveryKeyRef.current = nextKey
      targetsRef.current = discovered
      setTargets(discovered)
      reconcileSelection(discovered)
      applyProjectChangesToTargets(discovered)
    }

    const scheduler = createDiscoveryScheduler(rediscover)
    const observer = new MutationObserver((records) => {
      if (shouldRediscoverMutations(records)) scheduler.scheduleRediscovery()
    })
    observer.observe(document, { childList: true, subtree: true })
    const handleHashChange = () => {
      selectionCycleRef.current = { index: -1 }
      const parsedRoute = parsePreviewHash(window.location.hash)
      const liveState = useEditorStore.getState()
      const liveImportedMockup = liveState.importedMockup
      const screen = parsedRoute && liveImportedMockup?.screens.find((candidate) => getScreenPath(candidate) === parsedRoute.path)
      if (screen && liveState.currentScreenId !== screen.id) liveState.setCurrentScreenId(screen.id)
      const nextState = useEditorStore.getState()
      if (screen && parsedRoute?.state && nextState.currentStateId !== parsedRoute.state) nextState.setCurrentStateId(parsedRoute.state)
      scheduler.scheduleRediscovery()
    }
    window.addEventListener('hashchange', handleHashChange)
    discoveryCleanupRef.current = () => {
      observer.disconnect()
      window.removeEventListener('hashchange', handleHashChange)
      scheduler.cleanupDiscovery()
    }
    rediscover()

    const handleClick = (event: MouseEvent) => {
      if (interactionModeRef.current === 'interact') return
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false
        return
      }
      if (overlayRootRef.current?.contains(event.target as Node)) return
      const candidates = orderSelectionCandidates(getSelectableAncestorsAtNode(event.target, targetsRef.current))
      const result = cycleSelectionCandidate(
        candidates,
        selectionCycleRef.current.key,
        selectionCycleRef.current.index,
        { x: event.clientX, y: event.clientY },
        selectionCycleRef.current.point,
      )
      selectionCycleRef.current = result
      const target = result.target
      if (!target) {
        useEditorStore.getState().setSelection(undefined)
        return
      }
      event.preventDefault()
      event.stopPropagation()
      const liveState = useEditorStore.getState()
      setFlowStatus(undefined)
      const baseFrame = baseFramesRef.current.get(target.element) ?? getElementFrame(target.element)
      const frame = resolveVisualFrame(liveState.currentProject, liveState.currentScreenId ?? '', liveState.currentStateId, target.instanceId, baseFrame, target.componentId)
      const baseStyles = baseInspectorStylesRef.current.get(target.element) ?? readComputedStyleSnapshot(target.element)
      const candidatePath = candidates.map((candidate) => ({ componentId: candidate.componentId, instanceId: candidate.instanceId }))
      const componentTargets = targetsRef.current.filter((candidate) => candidate.componentId === target.componentId)
      const scopeValues: Record<string, string | number> = {}
      for (const property of target.editableProperties) {
        const values = componentTargets.map((candidate) => {
          const candidateBaseFrame = baseFramesRef.current.get(candidate.element) ?? getElementFrame(candidate.element)
          if (property === 'width' || property === 'height') return resolveVisualFrame(liveState.currentProject, liveState.currentScreenId ?? '', liveState.currentStateId, candidate.instanceId, candidateBaseFrame, candidate.componentId)[property]
          const candidateBaseStyles = baseInspectorStylesRef.current.get(candidate.element) ?? readComputedStyleSnapshot(candidate.element)
          return resolveInspectorStyles(liveState.currentProject, liveState.currentScreenId ?? '', liveState.currentStateId, candidate.instanceId, candidateBaseStyles, candidate.componentId)[property as keyof ReturnType<typeof readComputedStyleSnapshot>]
        })
        if (values.length > 0) scopeValues[property] = values.every((value) => sameValue(value, values[0])) ? values[0] as string | number : 'Mixed'
      }
      liveState.setSelection({
        elementId: target.instanceId,
        componentId: target.componentId,
        frame,
        editableProperties: target.editableProperties,
        styles: resolveInspectorStyles(liveState.currentProject, liveState.currentScreenId ?? '', liveState.currentStateId, target.instanceId, baseStyles, target.componentId),
        selectionPath: candidatePath,
        scopeValues,
        componentInstanceCount: componentTargets.length,
      })
      liveState.setEditScope('instance')
    }
    document.addEventListener('click', handleClick, true)
    iframeClickCleanupRef.current = () => document.removeEventListener('click', handleClick, true)
    setImportError(undefined)
  }, [applyProjectChangesToTargets, importedMockup, reconcileSelection, setImportError])

  useEffect(() => {
    applyProjectChangesToTargets(targets)
  }, [applyProjectChangesToTargets, targets, project.changes])

  useEffect(() => {
    moveableRef.current?.updateRect()
  }, [selectedElement?.frame, selectedTarget, viewport])

  const updateInteractionFrame = useCallback((frame: VisualFrame) => {
    const interaction = interactionRef.current
    if (!interaction) return
    interaction.current = frame
    const baseFrame = baseFramesRef.current.get(interaction.target.element) ?? interaction.before
    if (interaction.type === 'drag' && interaction.flow?.mode === 'spacing' && interaction.beforeMarginTop !== undefined) {
      const nextMarginTop = interaction.beforeMarginTop + (frame.y - interaction.before.y)
      applyFlowSpacing(interaction.target.element, nextMarginTop)
      setFlowStatus(`Spacing · margin-top ${nextMarginTop >= interaction.beforeMarginTop ? '+' : ''}${Math.round(nextMarginTop - interaction.beforeMarginTop)}px`)
    } else {
      applyVisualFrame(interaction.target.element, baseFrame, frame)
      if (interaction.type === 'drag') setFlowStatus('Move · visual position')
    }
    moveableRef.current?.updateRect()
    updateSelectionFrame(frame)
  }, [updateSelectionFrame])

  const commitInteraction = useCallback(() => {
    const interaction = interactionRef.current
    interactionRef.current = undefined
    setSnapActive(false)
    const liveState = useEditorStore.getState()
    const activeProject = liveState.currentProject
    const activeScreenId = liveState.currentScreenId
    const activeStateId = liveState.currentStateId
    if (!interaction || !activeScreenId || sameFrame(interaction.before, interaction.current)) return

    let nextChanges = [...activeProject.changes]
    if (interaction.type === 'drag' && interaction.flow?.mode === 'spacing' && interaction.beforeMarginTop !== undefined) {
      const afterMarginTop = interaction.beforeMarginTop + (interaction.current.y - interaction.before.y)
      nextChanges = upsertChange(nextChanges, createFlowSpacingChange(
        activeScreenId,
        activeStateId,
        interaction.target,
        interaction.beforeMarginTop,
        afterMarginTop,
        liveState.editScope,
      ))
    } else if (interaction.type === 'drag') {
      nextChanges = upsertChange(nextChanges, createPositionChange(
        activeScreenId,
        activeStateId,
        interaction.target.instanceId,
        interaction.target.componentId,
        interaction.before,
        interaction.current,
        undefined,
        { scope: liveState.editScope, referenceInstanceId: interaction.target.instanceId },
      ))
    } else {
      if (canDragTarget(interaction.target)
        && (interaction.before.x !== interaction.current.x || interaction.before.y !== interaction.current.y)) {
        nextChanges = upsertChange(nextChanges, createPositionChange(
          activeScreenId,
          activeStateId,
          interaction.target.instanceId,
          interaction.target.componentId,
          interaction.before,
          interaction.current,
          undefined,
          { scope: liveState.editScope, referenceInstanceId: interaction.target.instanceId },
        ))
      }
      if (canResizeWidth(interaction.target) && interaction.before.width !== interaction.current.width) {
        nextChanges = upsertChange(nextChanges, createDimensionChange(
          activeScreenId,
          activeStateId,
          interaction.target.instanceId,
          interaction.target.componentId,
          'width',
          interaction.before.width,
          interaction.current.width,
          undefined,
          { scope: liveState.editScope, referenceInstanceId: interaction.target.instanceId },
        ))
      }
      if (canResizeHeight(interaction.target) && interaction.before.height !== interaction.current.height) {
        nextChanges = upsertChange(nextChanges, createDimensionChange(
          activeScreenId,
          activeStateId,
          interaction.target.instanceId,
          interaction.target.componentId,
          'height',
          interaction.before.height,
          interaction.current.height,
          undefined,
          { scope: liveState.editScope, referenceInstanceId: interaction.target.instanceId },
        ))
      }
    }
    commitProject({ ...activeProject, changes: nextChanges })
    window.setTimeout(() => { suppressNextClickRef.current = false }, 0)
  }, [commitProject])

  // Static flow targets use this narrow iframe-local fallback when Moveable cannot start a native drag.
  useEffect(() => {
    if (interactionMode !== 'select' || !iframeDocument || !selectedTarget || !canDragTarget(selectedTarget)) return
    const decision = detectFlowDragMode(selectedTarget)
    if (decision.mode !== 'spacing') return
    const element = selectedTarget.element
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || interactionRef.current) return
      const rect = element.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return
      event.preventDefault()
      event.stopPropagation()
      const before = selectedElement?.frame ?? getElementFrame(element)
      const computed = element.ownerDocument.defaultView?.getComputedStyle(element)
      interactionRef.current = {
        type: 'drag', target: selectedTarget, before, current: before, flow: decision,
        beforeMarginTop: computed ? parseCssNumber(computed.marginTop, 0) : 0,
      }
      suppressNextClickRef.current = true
      setFlowStatus('Spacing · margin-top +0px')
      const startX = event.clientX
      const startY = event.clientY
      const handlePointerMove = (move: PointerEvent) => {
        const interaction = interactionRef.current
        if (!interaction || interaction.type !== 'drag') return
        const deltaX = move.clientX - startX
        const deltaY = move.clientY - startY
        if (Math.abs(deltaX) > Math.abs(deltaY)) interaction.flow = { mode: 'move', reason: 'horizontal drag' }
        updateInteractionFrame(frameFromDrag(before, [deltaX, deltaY]))
      }
      const cleanup = () => {
        iframeDocument.removeEventListener('pointermove', handlePointerMove, true)
        iframeDocument.removeEventListener('pointerup', handlePointerUp, true)
        iframeDocument.removeEventListener('pointercancel', cleanup, true)
      }
      const handlePointerUp = () => {
        cleanup()
        commitInteraction()
      }
      iframeDocument.addEventListener('pointermove', handlePointerMove, true)
      iframeDocument.addEventListener('pointerup', handlePointerUp, true)
      iframeDocument.addEventListener('pointercancel', cleanup, true)
    }
    iframeDocument.addEventListener('pointerdown', handlePointerDown, true)
    return () => iframeDocument.removeEventListener('pointerdown', handlePointerDown, true)
  }, [commitInteraction, iframeDocument, interactionMode, selectedElement, selectedTarget, updateInteractionFrame])

  const handleManualResizeStart = useCallback((event: PointerEvent, direction: string, handle: HTMLElement) => {
    if (interactionMode !== 'select') return
    if (!selectedTarget || !selectedElement || !iframeDocument) return
    if (interactionRef.current?.type === 'resize') return
    event.preventDefault()
    event.stopPropagation()
    try {
      handle.setPointerCapture(event.pointerId)
    } catch {
      // Pointer capture is not available in every iframe test environment.
    }
    const before = getElementFrame(selectedTarget.element)
    const startX = event.clientX
    const startY = event.clientY
    interactionRef.current = { type: 'resize', target: selectedTarget, before, current: before }

    const handlePointerMove = (moveEvent: PointerEvent | MouseEvent) => {
      const interaction = interactionRef.current
      if (!interaction || interaction.type !== 'resize') return
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      const adjustsLeft = direction.includes('w')
      const adjustsTop = direction.includes('n')
      const widthDelta = direction.includes('e') ? deltaX : adjustsLeft ? -deltaX : 0
      const heightDelta = direction.includes('s') ? deltaY : adjustsTop ? -deltaY : 0
      const nextWidth = canResizeWidth(interaction.target) ? Math.max(1, before.width + widthDelta) : before.width
      const nextHeight = canResizeHeight(interaction.target) ? Math.max(1, before.height + heightDelta) : before.height
      updateInteractionFrame({
        x: adjustsLeft ? before.x + (before.width - nextWidth) : before.x,
        y: adjustsTop ? before.y + (before.height - nextHeight) : before.y,
        width: nextWidth,
        height: nextHeight,
      })
    }
    const cleanupListeners = () => {
      iframeDocument.removeEventListener('pointermove', handlePointerMove, true)
      iframeDocument.removeEventListener('mousemove', handlePointerMove, true)
      iframeDocument.removeEventListener('pointerup', handlePointerUp, true)
      iframeDocument.removeEventListener('mouseup', handlePointerUp, true)
      iframeDocument.defaultView?.removeEventListener('pointermove', handlePointerMove, true)
      iframeDocument.defaultView?.removeEventListener('mousemove', handlePointerMove, true)
      iframeDocument.defaultView?.removeEventListener('pointerup', handlePointerUp, true)
      iframeDocument.defaultView?.removeEventListener('mouseup', handlePointerUp, true)
      handle.removeEventListener('pointermove', handlePointerMove, true)
      handle.removeEventListener('mousemove', handlePointerMove, true)
      handle.removeEventListener('pointerup', handlePointerUp, true)
      handle.removeEventListener('mouseup', handlePointerUp, true)
      if (activeResizeCleanupRef.current === cleanupListeners) activeResizeCleanupRef.current = undefined
    }
    const handlePointerUp = () => {
      cleanupListeners()
      commitInteraction()
    }
    iframeDocument.addEventListener('pointermove', handlePointerMove, true)
    iframeDocument.addEventListener('mousemove', handlePointerMove, true)
    iframeDocument.addEventListener('pointerup', handlePointerUp, true)
    iframeDocument.addEventListener('mouseup', handlePointerUp, true)
    iframeDocument.defaultView?.addEventListener('pointermove', handlePointerMove, true)
    iframeDocument.defaultView?.addEventListener('mousemove', handlePointerMove, true)
    iframeDocument.defaultView?.addEventListener('pointerup', handlePointerUp, true)
    iframeDocument.defaultView?.addEventListener('mouseup', handlePointerUp, true)
    handle.addEventListener('pointermove', handlePointerMove, true)
    handle.addEventListener('mousemove', handlePointerMove, true)
    handle.addEventListener('pointerup', handlePointerUp, true)
    handle.addEventListener('mouseup', handlePointerUp, true)
    activeResizeCleanupRef.current = cleanupListeners
  }, [commitInteraction, iframeDocument, interactionMode, selectedElement, selectedTarget, updateInteractionFrame])

  const registerManualResizeHandle = useCallback((handle: HTMLDivElement | null) => {
    if (!handle) return
    const listener = (event: PointerEvent) => handleManualResizeStart(event, handle.dataset.direction ?? '', handle)
    handle.addEventListener('pointerdown', listener, true)
    resizeListenersRef.current.set(handle, listener)
  }, [handleManualResizeStart])

  const cancelActiveInteraction = useCallback(() => {
    activeResizeCleanupRef.current?.()
    activeResizeCleanupRef.current = undefined
    moveableRef.current?.stopDrag()
    interactionRef.current = undefined
  }, [])

  useEffect(() => {
    cancelActiveInteraction()
    selectionCycleRef.current = { index: -1 }
    const resetSnapTimer = window.setTimeout(() => setSnapActive(false), 0)
    return () => {
      window.clearTimeout(resetSnapTimer)
    }
  }, [cancelActiveInteraction, interactionMode])

  useEffect(() => {
    const moveable = moveableRef.current
    const resizeListeners = resizeListenersRef.current
    return () => {
      discoveryCleanupRef.current?.()
      discoveryCleanupRef.current = undefined
      iframeClickCleanupRef.current?.()
      iframeShortcutCleanupRef.current?.()
      overlayRootRef.current?.remove()
      overlayRootRef.current = null
      activeResizeCleanupRef.current?.()
      activeResizeCleanupRef.current = undefined
      moveable?.stopDrag()
      resizeListeners.forEach((listener, handle) => handle.removeEventListener('pointerdown', listener, true))
      resizeListeners.clear()
    }
  }, [])

  useEffect(() => {
    if (importedMockup) return
    discoveryCleanupRef.current?.()
    discoveryCleanupRef.current = undefined
    iframeClickCleanupRef.current?.()
    iframeClickCleanupRef.current = undefined
    iframeShortcutCleanupRef.current?.()
    iframeShortcutCleanupRef.current = undefined
    overlayRootRef.current?.remove()
    overlayRootRef.current = null
  }, [importedMockup])

  const handleDragStart = useCallback((event: OnDragStart) => {
    if (interactionMode !== 'select') return
    if (!selectedTarget || !canDragTarget(selectedTarget)) return
    const before = selectedElement?.frame ?? getElementFrame(selectedTarget.element)
    const sourceEvent = event.inputEvent as (MouseEvent | PointerEvent | undefined)
    const flow = detectFlowDragMode(selectedTarget, Boolean(sourceEvent?.altKey))
    const computed = selectedTarget.element.ownerDocument.defaultView?.getComputedStyle(selectedTarget.element)
    event.set([0, 0])
    interactionRef.current = { type: 'drag', target: selectedTarget, before, current: before, flow, beforeMarginTop: computed ? parseCssNumber(computed.marginTop, 0) : undefined }
    suppressNextClickRef.current = true
    setFlowStatus(flow.mode === 'spacing' ? 'Spacing · margin-top +0px' : 'Move · visual position')
  }, [interactionMode, selectedElement, selectedTarget])

  const handleDrag = useCallback((event: OnDrag) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.type !== 'drag') return
    if (interaction.flow?.mode === 'spacing' && Math.abs(event.beforeTranslate[0] ?? 0) > Math.abs(event.beforeTranslate[1] ?? 0)) {
      interaction.flow = { mode: 'move', reason: 'horizontal drag' }
    }
    updateInteractionFrame(frameFromDrag(interaction.before, event.beforeTranslate))
  }, [updateInteractionFrame])

  const handleResizeStart = useCallback((event: OnResizeStart) => {
    if (interactionMode !== 'select') return
    if (!selectedTarget || !canResizeTarget(selectedTarget)) return
    const before = selectedElement?.frame ?? getElementFrame(selectedTarget.element)
    event.set([before.width, before.height])
    if (event.dragStart) event.dragStart.set([0, 0])
    interactionRef.current = { type: 'resize', target: selectedTarget, before, current: before }
    suppressNextClickRef.current = true
  }, [interactionMode, selectedElement, selectedTarget])

  const handleResize = useCallback((event: OnResize) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.type !== 'resize') return
    const translate = event.drag?.beforeTranslate ?? [0, 0]
    updateInteractionFrame({
      x: canDragTarget(interaction.target) ? interaction.before.x + (translate[0] ?? 0) : interaction.before.x,
      y: canDragTarget(interaction.target) ? interaction.before.y + (translate[1] ?? 0) : interaction.before.y,
      width: canResizeWidth(interaction.target) ? Math.max(1, event.width) : interaction.before.width,
      height: canResizeHeight(interaction.target) ? Math.max(1, event.height) : interaction.before.height,
    })
  }, [updateInteractionFrame])

  const moveable = iframeDocument && overlayRoot && interactionMode === 'select' && selectedTarget ? createPortal(
    <Moveable
      ref={moveableRef}
      target={selectedTarget.element}
      container={iframeDocument.body}
      rootContainer={iframeDocument.body}
      origin={false}
      draggable={canDragTarget(selectedTarget)}
      resizable={canResizeTarget(selectedTarget)}
      renderDirections={getResizeDirections(selectedTarget)}
      snappable
      snapContainer={iframeDocument.documentElement}
      snapThreshold={5}
      isDisplaySnapDigit
      horizontalGuidelines={[0, viewport.height / 2, viewport.height]}
      verticalGuidelines={[0, viewport.width / 2, viewport.width]}
      elementGuidelines={targets.filter((target) => target.element !== selectedTarget.element).map((target) => target.element)}
      bounds={{ left: 0, top: 0, right: viewport.width, bottom: viewport.height }}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={commitInteraction}
      onResizeStart={handleResizeStart}
      onResize={handleResize}
      onResizeEnd={commitInteraction}
      onSnap={() => { window.setTimeout(() => setSnapActive(true), 0) }}
    />,
    overlayRoot,
  ) : null

  const snapGuides = iframeDocument && overlayRoot && selectedTarget && snapActive ? createPortal(
    <>
      <div
        data-testid="snap-vertical-guide"
        aria-hidden="true"
        style={{ position: 'absolute', left: `${viewport.width / 2}px`, top: 0, width: '1px', height: `${viewport.height}px`, background: '#f6b73c', borderLeft: '1px dashed #f6b73c', pointerEvents: 'none' }}
      />
      <div
        data-testid="snap-horizontal-guide"
        aria-hidden="true"
        style={{ position: 'absolute', left: 0, top: `${viewport.height / 2}px`, width: `${viewport.width}px`, height: '1px', background: '#f6b73c', borderTop: '1px dashed #f6b73c', pointerEvents: 'none' }}
      />
    </>,
    overlayRoot,
  ) : null

  const manualResizeHandles = iframeDocument && overlayRoot && interactionMode === 'select' && selectedTarget && selectedElement && canResizeTarget(selectedTarget)
    ? createPortal(
      getResizeDirections(selectedTarget).map((direction) => {
        const scrollX = iframeDocument.defaultView?.scrollX ?? 0
        const scrollY = iframeDocument.defaultView?.scrollY ?? 0
        const frame = selectedElement.frame
        const left = direction.includes('e') ? frame.x + frame.width - 7 : direction.includes('w') ? frame.x - 7 : frame.x + frame.width / 2 - 7
        const top = direction.includes('s') ? frame.y + frame.height - 7 : direction.includes('n') ? frame.y - 7 : frame.y + frame.height / 2 - 7
        return (
          <div
            key={direction}
            className={`uilab-manual-resize-handle uilab-manual-resize-handle--${direction}`}
            data-testid={`manual-resize-${direction}`}
            data-direction={direction}
            aria-label={`Resize ${direction}`}
            ref={registerManualResizeHandle}
            style={{ position: 'absolute', left: `${left - scrollX}px`, top: `${top - scrollY}px`, width: '14px', height: '14px', border: '2px solid white', borderRadius: '50%', background: '#4af', boxShadow: '0 0 0 1px rgba(0,0,0,.2)', cursor: `${direction}-resize`, pointerEvents: 'auto', zIndex: 3002 }}
          />
        )
      }),
      overlayRoot,
    )
    : null

  return (
    <section className="preview-panel" aria-label="Preview area">
      <div className="panel-heading preview-panel__heading">
        <div>
          <p className="eyebrow">Canvas</p>
          <h1>Preview</h1>
        </div>
        <span className="status-chip">{importedMockup ? 'Imported preview' : hasPersistedMockup ? 'Re-import required' : 'Blank project'}</span>
      </div>
      <div className="preview-stage">
        <div
          className="viewport-frame"
          data-testid="viewport-frame"
          aria-label={`Preview viewport ${viewport.width} by ${viewport.height}`}
          style={{ width: `${viewport.width}px`, height: `${viewport.height}px` }}
        >
          {importedMockup && route ? (
            <iframe
              ref={iframeRef}
              title={`${importedMockup.name} preview`}
              className="preview-frame"
              src={previewSource ? route : undefined}
              srcDoc={previewSource ? undefined : importedMockup.previewHtml}
              onLoad={handleIframeLoad}
              onError={() => setImportError('The imported preview could not load inside the iframe.')}
            />
          ) : (
            <div className="viewport-frame__empty">
              <span className="empty-glyph" aria-hidden="true">+</span>
              <strong>{hasPersistedMockup ? 'Re-import mockup to preview' : 'No screen selected'}</strong>
              <span>{hasPersistedMockup ? 'Imported preview files are kept in memory only.' : 'Import an Adapter v1 mockup ZIP to begin.'}</span>
            </div>
          )}
          {snapGuides}
          {manualResizeHandles}
          {moveable}
        </div>
      </div>
      <footer className="preview-panel__footer">
        <span>{viewport.width} × {viewport.height}px</span>
        {selectedTarget && interactionMode === 'select' && <span className="preview-panel__editing-status">{flowStatus ? `${flowStatus}${snapActive ? ' · Snap active' : ''}` : `Guides enabled${snapActive ? ' · Snap active' : ''}`}</span>}
      </footer>
    </section>
  )
}
