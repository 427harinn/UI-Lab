import { create } from 'zustand'
import { getScreenPath, getStatesForScreen, resolveDefaultState, type ImportedMockup } from '../../schemas/adapter'
import type { UiLabProject, Viewport } from '../../schemas/project'
import { importMockupZip } from '../mockup/importer'
import type { SelectedElementSnapshot } from '../visual-editing/model'
import type { InspectorStyleSnapshot } from '../visual-editing/inspector'
import { loadPersistedProject, persistProject, type ProjectStorage } from './persistence'
import { loadProjectPackage } from './package'

export type InteractionMode = 'select' | 'interact'

export interface EditorStore {
  currentProject: UiLabProject
  viewport: Viewport
  currentScreenId?: string
  currentStateId?: string
  selectedElementId?: string
  selectedComponentId?: string
  selectedElement?: SelectedElementSnapshot
  importedMockup?: ImportedMockup
  isImporting: boolean
  importError?: string
  status?: EditorStatus
  past: UiLabProject[]
  future: UiLabProject[]
  canUndo: boolean
  canRedo: boolean
  interactionMode: InteractionMode
  setViewport: (viewport: Viewport) => void
  setInteractionMode: (mode: InteractionMode) => void
  setCurrentScreenId: (screenId?: string) => void
  setCurrentStateId: (stateId?: string) => void
  setSelectedElementId: (elementId?: string) => void
  setSelection: (selection?: SelectedElementSnapshot) => void
  updateSelectionFrame: (frame: SelectedElementSnapshot['frame']) => void
  updateSelectionStyles: (styles: InspectorStyleSnapshot) => void
  importMockupFile: (input: Blob | ArrayBuffer | Uint8Array) => Promise<boolean>
  importProjectFile: (input: Blob | ArrayBuffer | Uint8Array) => Promise<boolean>
  setImportError: (message?: string) => void
  setStatus: (status?: EditorStatus) => void
  updateProjectName: (name: string) => void
  replaceProject: (project: UiLabProject) => void
  commitProject: (project: UiLabProject) => void
  undo: () => void
  redo: () => void
}

export interface EditorStatus {
  kind: 'success' | 'error' | 'info'
  message: string
}

function getBrowserStorage(): ProjectStorage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage
}

function updateHistoryFlags(past: UiLabProject[], future: UiLabProject[]) {
  return { past, future, canUndo: past.length > 0, canRedo: future.length > 0 }
}

function clearSelection() {
  return { selectedElementId: undefined, selectedComponentId: undefined, selectedElement: undefined }
}

function createImportedProject(imported: ImportedMockup): UiLabProject {
  const firstScreen = imported.screens[0]
  const firstState = firstScreen ? resolveDefaultState(firstScreen, imported.states) : undefined

  return {
    formatVersion: 1,
    id: crypto.randomUUID(),
    name: imported.name,
    source: { type: 'mockup', name: imported.name },
    viewport: { ...imported.defaultViewport },
    screens: imported.screens.map((screen) => ({
      id: screen.id,
      name: screen.name,
      route: getScreenPath(screen),
      states: getStatesForScreen(imported.states, screen.id).map((state) => ({ id: state.id, name: state.name })),
    })),
    components: imported.components.map((component) => ({
      id: component.id,
      name: component.id,
      type: component.id,
      selector: component.selector,
      instances: component.instances,
      editableProperties: [...component.editable],
    })),
    tokens: imported.tokens,
    changes: [],
    editor: {
      currentScreenId: firstScreen?.id,
      currentStateId: firstState,
    },
  }
}

function createStore(storage: ProjectStorage | undefined) {
  const initialProject = loadPersistedProject(storage)

  return create<EditorStore>((set, get) => {
    const commitProject = (project: UiLabProject) => {
      set((state) => {
        const past = [...state.past, state.currentProject]
        persistProject(project, storage)
        return {
          currentProject: project,
          viewport: project.viewport,
          currentScreenId: project.editor.currentScreenId,
          currentStateId: project.editor.currentStateId,
          selectedElementId: state.selectedElementId,
          ...updateHistoryFlags(past, []),
        }
      })
    }

    return {
      currentProject: initialProject,
      viewport: initialProject.viewport,
      currentScreenId: initialProject.editor.currentScreenId,
      currentStateId: initialProject.editor.currentStateId,
      selectedElementId: initialProject.editor.selectedElementId,
      selectedComponentId: undefined,
      selectedElement: undefined,
      importedMockup: undefined,
      isImporting: false,
      importError: undefined,
      status: undefined,
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      interactionMode: 'select',
      setViewport: (viewport) => {
        const current = get().currentProject
        if (current.viewport.width === viewport.width && current.viewport.height === viewport.height) return
        commitProject({ ...current, viewport: { ...viewport } })
      },
      setInteractionMode: (interactionMode) => set({ interactionMode }),
      setCurrentScreenId: (currentScreenId) => {
        const state = get()
        const imported = state.importedMockup
        const screen = imported?.screens.find((item) => item.id === currentScreenId)
        const currentStateId = imported && screen ? resolveDefaultState(screen, imported.states) : state.currentStateId
        const currentProject = state.currentProject
        const nextProject = {
          ...currentProject,
          editor: { ...currentProject.editor, currentScreenId, currentStateId, selectedElementId: undefined },
        }
        persistProject(nextProject, storage)
        set({ currentProject: nextProject, currentScreenId, currentStateId, ...clearSelection() })
      },
      setCurrentStateId: (currentStateId) => {
        const currentProject = get().currentProject
        const nextProject = { ...currentProject, editor: { ...currentProject.editor, currentStateId, selectedElementId: undefined } }
        persistProject(nextProject, storage)
        set({ currentProject: nextProject, currentStateId, ...clearSelection() })
      },
      setSelectedElementId: (selectedElementId) => set(selectedElementId
        ? { selectedElementId }
        : clearSelection()),
      setSelection: (selectedElement) => set({
        selectedElement,
        selectedElementId: selectedElement?.elementId,
        selectedComponentId: selectedElement?.componentId,
      }),
      updateSelectionFrame: (frame) => set((state) => {
        if (!state.selectedElement) return state
        const current = state.selectedElement.frame
        if (current.x === frame.x && current.y === frame.y && current.width === frame.width && current.height === frame.height) return state
        return { selectedElement: { ...state.selectedElement, frame } }
      }),
      updateSelectionStyles: (styles) => set((state) => {
        if (!state.selectedElement) return state
        const current = state.selectedElement.styles
        const unchanged = current && Object.keys(styles).every((key) => current[key as keyof InspectorStyleSnapshot] === styles[key as keyof InspectorStyleSnapshot])
        return unchanged ? state : { selectedElement: { ...state.selectedElement, styles } }
      }),
      importMockupFile: async (input) => {
        set({ isImporting: true, importError: undefined, status: undefined })
        try {
          const importedMockup = await importMockupZip(input)
          const project = createImportedProject(importedMockup)
          persistProject(project, storage)
          set({
            currentProject: project,
            viewport: project.viewport,
            currentScreenId: project.editor.currentScreenId,
            currentStateId: project.editor.currentStateId,
            ...clearSelection(),
            importedMockup,
            isImporting: false,
            importError: undefined,
            status: { kind: 'success', message: 'Mockup imported' },
            ...updateHistoryFlags([], []),
          })
          return true
        } catch (error) {
          const message = error instanceof Error ? error.message : 'The mockup could not be imported.'
          set({ isImporting: false, importError: message, status: { kind: 'error', message: 'Mockup Import error. The selected mockup could not be imported.' } })
          return false
        }
      },
      importProjectFile: async (input) => {
        set({ isImporting: true, importError: undefined, status: undefined })
        try {
          // loadProjectPackage validates the entire archive before this single state
          // transition, so a failed import cannot partially replace the open project.
          const loaded = await loadProjectPackage(input)
          const project = loaded.project
          persistProject(project, storage)
          set({
            currentProject: project,
            viewport: project.viewport,
            currentScreenId: project.editor.currentScreenId,
            currentStateId: project.editor.currentStateId,
            ...clearSelection(),
            importedMockup: loaded.importedMockup,
            isImporting: false,
            importError: undefined,
            status: { kind: 'success', message: 'Project imported' },
            ...updateHistoryFlags([], []),
          })
          return true
        } catch (error) {
          const message = error instanceof Error ? error.message : 'The project could not be imported.'
          set({ isImporting: false, importError: message, status: { kind: 'error', message: 'Project Import error. The selected project could not be imported.' } })
          return false
        }
      },
      setImportError: (importError) => set({ importError, status: importError ? { kind: 'error', message: importError } : undefined }),
      setStatus: (status) => set({ status }),
      updateProjectName: (name) => {
        const current = get().currentProject
        commitProject({ ...current, name })
      },
      replaceProject: (project) => {
        persistProject(project, storage)
        set({
          currentProject: project,
          viewport: project.viewport,
          currentScreenId: project.editor.currentScreenId,
          currentStateId: project.editor.currentStateId,
          ...clearSelection(),
          importedMockup: undefined,
          importError: undefined,
          status: undefined,
          ...updateHistoryFlags([], []),
        })
      },
      commitProject,
      undo: () => {
        set((state) => {
          const previous = state.past.at(-1)
          if (!previous) return state
          const past = state.past.slice(0, -1)
          const future = [state.currentProject, ...state.future]
          persistProject(previous, storage)
          return {
            currentProject: previous,
            viewport: previous.viewport,
            currentScreenId: previous.editor.currentScreenId,
            currentStateId: previous.editor.currentStateId,
            ...clearSelection(),
            ...updateHistoryFlags(past, future),
          }
        })
      },
      redo: () => {
        set((state) => {
          const next = state.future[0]
          if (!next) return state
          const future = state.future.slice(1)
          const past = [...state.past, state.currentProject]
          persistProject(next, storage)
          return {
            currentProject: next,
            viewport: next.viewport,
            currentScreenId: next.editor.currentScreenId,
            currentStateId: next.editor.currentStateId,
            ...clearSelection(),
            ...updateHistoryFlags(past, future),
          }
        })
      },
    }
  })
}

export const useEditorStore = createStore(getBrowserStorage())

export function createEditorStore(storage?: ProjectStorage) {
  return createStore(storage)
}
