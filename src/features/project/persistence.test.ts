import { beforeEach, describe, expect, it } from 'vitest'
import { createBlankProject } from './blankProject'
import { loadPersistedProject, persistProject, PROJECT_STORAGE_KEY } from './persistence'

describe('project persistence', () => {
  beforeEach(() => window.localStorage.clear())

  it('restores a valid persisted project', () => {
    const project = createBlankProject()
    project.name = 'Restored project'
    persistProject(project, window.localStorage)

    expect(loadPersistedProject(window.localStorage)).toEqual(project)
  })

  it('falls back to a blank project for corrupt data', () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, '{not-json')

    const restored = loadPersistedProject(window.localStorage)
    expect(restored.name).toBe('Untitled UI Project')
    expect(restored.source.type).toBe('blank')
  })

  it('falls back to a blank project for a schema-invalid value', () => {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify({ formatVersion: 1 }))

    expect(loadPersistedProject(window.localStorage).screens).toEqual([])
  })
})
