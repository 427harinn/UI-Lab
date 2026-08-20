import { describe, expect, it } from 'vitest'
import { uiLabProjectSchema, viewportSchema } from './project'
import { createBlankProject } from '../features/project/blankProject'

describe('UI Lab schemas', () => {
  it('accepts a blank project', () => {
    expect(uiLabProjectSchema.safeParse(createBlankProject()).success).toBe(true)
  })

  it('rejects an unsupported format version', () => {
    const result = uiLabProjectSchema.safeParse({ ...createBlankProject(), formatVersion: 2 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid viewport dimensions', () => {
    expect(viewportSchema.safeParse({ width: -390, height: 844 }).success).toBe(false)
    expect(viewportSchema.safeParse({ width: 390.5, height: 844 }).success).toBe(false)
  })
})
