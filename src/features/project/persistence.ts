import { uiLabProjectSchema, type UiLabProject } from '../../schemas/project'
import { createBlankProject } from './blankProject'

export const PROJECT_STORAGE_KEY = 'ui-lab:project:v1'
export type ProjectStorage = Pick<Storage, 'getItem' | 'setItem'>

export function loadPersistedProject(storage?: ProjectStorage): UiLabProject {
  try {
    const serialized = storage?.getItem(PROJECT_STORAGE_KEY)
    if (!serialized) return createBlankProject()

    const parsed: unknown = JSON.parse(serialized)
    const result = uiLabProjectSchema.safeParse(parsed)
    return result.success ? result.data : createBlankProject()
  } catch {
    return createBlankProject()
  }
}

export function persistProject(project: UiLabProject, storage?: ProjectStorage): void {
  try {
    storage?.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project))
  } catch {
    // Storage is best-effort. The editor remains usable when it is unavailable.
  }
}
