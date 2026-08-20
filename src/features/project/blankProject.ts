import type { UiLabProject } from '../../schemas/project'

export const DEFAULT_VIEWPORT = { width: 390, height: 844 } as const

export function createBlankProject(): UiLabProject {
  return {
    formatVersion: 1,
    id: crypto.randomUUID(),
    name: 'Untitled UI Project',
    source: { type: 'blank' },
    viewport: { ...DEFAULT_VIEWPORT },
    screens: [],
    components: [],
    tokens: {},
    changes: [],
    editor: {},
  }
}
