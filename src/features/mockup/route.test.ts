import { describe, expect, it } from 'vitest'
import { buildPreviewRoute } from './route'

describe('Adapter preview routes', () => {
  it('builds the entry hash route with a UI Lab state', () => {
    expect(buildPreviewRoute('dist/index.html', '/home', 'normal')).toBe('dist/index.html#/home?uilabState=normal')
    expect(buildPreviewRoute('dist/index.html', '/home', 'overdue')).toBe('dist/index.html#/home?uilabState=overdue')
  })

  it('encodes state values and preserves an existing path query', () => {
    expect(buildPreviewRoute('preview.html', 'shopping', 'needs review')).toBe('preview.html#/shopping?uilabState=needs%20review')
    expect(buildPreviewRoute('preview.html', '/home?tab=today', 'normal')).toBe('preview.html#/home?tab=today&uilabState=normal')
  })
})
