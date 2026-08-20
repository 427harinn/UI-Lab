import { create } from 'zustand'
import { getScreenPath, getStatesForScreen, resolveDefaultState, type ImportedMockup } from '../../schemas/adapter'
import type { UiLabProject, Viewport } from '../../schemas/project'
import { importMockupZip } from '../mockup/importer'
import { loadPersistedProject, persistProject, type ProjectStorage } from './persistence'

export interface EditorStore {
  currentProject: UiLabProject
  viewport: Viewport
  currentScreenId?: string
  currentStateId?: string
  selectedElementId?: string
  importedMockup?: ImportedMockup
  isImporting: boolean
  importError?: string
  past: UiLabProject[]
  future: UiLabProject[]
  canUndo: boolean
  canRedo: boolean
  setViewport: (viewport: Viewport) => void
  setCurrentScreenId: (screenId?: string) => void
  setCurrentStateId: (stateId?: string) => void
  setSelectedElementId: (elementId?: string) => void
  importMockupFile: (input: Blob | ArrayBuffer | Uint8Array) => Promise<boolean>
  setImportError: (message?: string) => void
  updateProjectName: (name: string) => void
  replaceProject: (project: UiLabProject) => void
  commitProject: (project: UiLabProject) => void
  undo: () => void
  redo: () => void
}

function getBrowserStorage(): ProjectStorage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage
}

function updateHistoryFlags(past: UiLabProject[], future: UiLabProject[]) {
  return { past, future, canUndo: past.length > 0, canRedo: future.length > 0 }
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
          selectedElementId: project.editor.selectedElementId,
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
      importedMockup: undefined,
      isImporting: false,
      importError: undefined,
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      setViewport: (viewport) => {
        const current = get().currentProject
        if (current.viewport.width === viewport.width && current.viewport.height === viewport.height) return
        commitProject({ ...current, viewport: { ...viewport } })
      },
      setCurrentScreenId: (currentScreenId) => {
        const state = get()
        const imported = state.importedMockup
        const screen = imported?.screens.find((item) => item.id === currentScreenId)
        const currentStateId = imported && screen ? resolveDefaultState(screen, imported.states) : state.currentStateId
        const currentProject = state.currentProject
        const nextProject = {
          ...currentProject,
          editor: { ...currentProject.editor, currentScreenId, currentStateId },
        }
        persistProject(nextProject, storage)
        set({ currentProject: nextProject, currentScreenId, currentStateId })
      },
      setCurrentStateId: (currentStateId) => {
        const currentProject = get().currentProject
        const nextProject = { ...currentProject, editor: { ...currentProject.editor, currentStateId } }
        persistProject(nextProject, storage)
        set({ currentProject: nextProject, currentStateId })
      },
      setSelectedElementId: (selectedElementId) => set({ selectedElementId }),
      importMockupFile: async (input) => {
        set({ isImporting: true, importError: undefined })
        try {
          const importedMockup = await importMockupZip(input)
          const project = createImportedProject(importedMockup)
          persistProject(project, storage)
          set({
            currentProject: project,
            viewport: project.viewport,
            currentScreenId: project.editor.currentScreenId,
            currentStateId: project.editor.currentStateId,
            selectedElementId: project.editor.selectedElementId,
            importedMockup,
            isImporting: false,
            importError: undefined,
            ...updateHistoryFlags([], []),
          })
          return true
        } catch (error) {
          const message = error instanceof Error ? error.message : 'The mockup could not be imported.'
          set({ isImporting: false, importError: message })
          return false
        }
      },
      setImportError: (importError) => set({ importError }),
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
          selectedElementId: project.editor.selectedElementId,
          importedMockup: undefined,
          importError: undefined,
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
            selectedElementId: previous.editor.selectedElementId,
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
            selectedElementId: next.editor.selectedElementId,
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
