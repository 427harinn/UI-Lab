import { describe, expect, it } from 'vitest'
import { createBlankProject } from './blankProject'

describe('createBlankProject', () => {
  it('creates the required empty project defaults', () => {
    const project = createBlankProject()

    expect(project).toMatchObject({
      formatVersion: 1,
      name: 'Untitled UI Project',
      source: { type: 'blank' },
      viewport: { width: 390, height: 844 },
      screens: [],
      components: [],
      tokens: {},
      changes: [],
      editor: {},
    })
    expect(project.id).toEqual(expect.any(String))
  })

  it('creates a new id for each project', () => {
    expect(createBlankProject().id).not.toBe(createBlankProject().id)
  })
})
