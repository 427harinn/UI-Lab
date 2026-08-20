import { create } from 'zustand'
import type { UiLabProject, Viewport } from '../../schemas/project'
import { loadPersistedProject, persistProject, type ProjectStorage } from './persistence'

export interface EditorStore {
  currentProject: UiLabProject
  viewport: Viewport
  currentScreenId?: string
  currentStateId?: string
  selectedElementId?: string
  past: UiLabProject[]
  future: UiLabProject[]
  canUndo: boolean
  canRedo: boolean
  setViewport: (viewport: Viewport) => void
  setCurrentScreenId: (screenId?: string) => void
  setCurrentStateId: (stateId?: string) => void
  setSelectedElementId: (elementId?: string) => void
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
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      setViewport: (viewport) => {
        const current = get().currentProject
        if (current.viewport.width === viewport.width && current.viewport.height === viewport.height) return
        commitProject({ ...current, viewport: { ...viewport } })
      },
      setCurrentScreenId: (currentScreenId) => set({ currentScreenId }),
      setCurrentStateId: (currentStateId) => set({ currentStateId }),
      setSelectedElementId: (selectedElementId) => set({ selectedElementId }),
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
