import { beforeEach, describe, expect, it } from 'vitest'
import { createBlankProject } from './blankProject'
import { createEditorStore } from './store'
import { serializeProjectPackage } from './package'

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

  it('keeps a visual edit with multiple property changes as one history entry', () => {
    const project = store.getState().currentProject
    store.getState().commitProject({
      ...project,
      changes: [
        {
          id: 'drag', screenId: 'home', stateId: 'normal', elementId: 'task-bird', componentId: 'Home.TaskRow',
          property: 'position', before: { x: 0, y: 0 }, after: { x: 20, y: 30 }, valueType: 'visual', updatedAt: new Date().toISOString(),
        },
        {
          id: 'resize-width', screenId: 'home', stateId: 'normal', elementId: 'task-bird', componentId: 'Home.TaskRow',
          property: 'width', before: 120, after: 160, valueType: 'visual', updatedAt: new Date().toISOString(),
        },
      ],
    })

    expect(store.getState().past).toHaveLength(1)
    store.getState().undo()
    expect(store.getState().currentProject.changes).toHaveLength(0)
    store.getState().redo()
    expect(store.getState().currentProject.changes).toHaveLength(2)
  })

  it('keeps the current project unchanged when a project import fails', async () => {
    store.getState().updateProjectName('Open project')
    const before = store.getState().currentProject

    const imported = createBlankProject()
    imported.name = 'Imported project'
    const result = await store.getState().importProjectFile(await serializeProjectPackage(imported))

    expect(result).toBe(true)
    expect(store.getState().currentProject.name).toBe('Imported project')
    expect(store.getState().past).toHaveLength(0)

    const failed = await store.getState().importProjectFile(new Uint8Array([9, 8, 7]))
    expect(failed).toBe(false)
    expect(store.getState().currentProject.name).toBe('Imported project')
    expect(store.getState().currentProject).not.toEqual(before)
    expect(store.getState().importError).toContain('readable ZIP')
  })
})
