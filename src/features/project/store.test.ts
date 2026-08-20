import { beforeEach, describe, expect, it } from 'vitest'
import { createBlankProject } from './blankProject'
import { createEditorStore } from './store'

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() { return values.size },
  }
}

describe('editor store', () => {
  let store: ReturnType<typeof createEditorStore>

  beforeEach(() => {
    store = createEditorStore(memoryStorage())
  })

  it('updates viewport state and project together', () => {
    store.getState().setViewport({ width: 430, height: 932 })

    expect(store.getState().viewport).toEqual({ width: 430, height: 932 })
    expect(store.getState().currentProject.viewport).toEqual({ width: 430, height: 932 })
  })

  it('undoes and redoes one committed change', () => {
    const original = store.getState().currentProject
    store.getState().updateProjectName('Edited project')
    expect(store.getState().canUndo).toBe(true)

    store.getState().undo()
    expect(store.getState().currentProject.name).toBe(original.name)
    expect(store.getState().canUndo).toBe(false)
    expect(store.getState().canRedo).toBe(true)

    store.getState().redo()
    expect(store.getState().currentProject.name).toBe('Edited project')
    expect(store.getState().canRedo).toBe(false)
  })

  it('clears redo history after a new commit', () => {
    store.getState().updateProjectName('First')
    store.getState().undo()
    store.getState().updateProjectName('Second')

    expect(store.getState().canRedo).toBe(false)
    expect(store.getState().currentProject.name).toBe('Second')
  })

  it('can replace the project and reset history', () => {
    const project = createBlankProject()
    project.name = 'Replacement'
    store.getState().updateProjectName('Temporary')
    store.getState().replaceProject(project)

    expect(store.getState().currentProject).toEqual(project)
    expect(store.getState().canUndo).toBe(false)
  })
})
