import JSZip from 'jszip'
import {
  adapterComponentsSchema,
  adapterProjectSchema,
  adapterScreensSchema,
  adapterStatesSchema,
  adapterTokensSchema,
  type AdapterComponentDocument,
  type AdapterScreenDocument,
  type AdapterStateDocument,
  type ImportedMockup,
} from '../../schemas/adapter'

export const REQUIRED_ADAPTER_FILES = [
  '.uilab/project.json',
  '.uilab/screens.json',
  '.uilab/components.json',
  '.uilab/tokens.json',
  '.uilab/states.json',
] as const

export type MockupImportErrorCode =
  | 'invalid-zip'
  | 'missing-file'
  | 'invalid-json'
  | 'invalid-schema'
  | 'unsupported-format'
  | 'missing-entry'
  | 'entry-not-found'

export class MockupImportError extends Error {
  readonly code: MockupImportErrorCode

  constructor(code: MockupImportErrorCode, message: string) {
    super(message)
    this.name = 'MockupImportError'
    this.code = code
  }
}

function parseJson(text: string, path: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new MockupImportError('invalid-json', `The adapter file “${path}” contains invalid JSON.`)
  }
}

async function readJson(zip: JSZip, path: string): Promise<unknown> {
  const file = zip.file(path)
  if (!file) throw new MockupImportError('missing-file', `The mockup is missing required adapter file “${path}”.`)
  try {
    return parseJson(await file.async('string'), path)
  } catch (error) {
    if (error instanceof MockupImportError) throw error
    throw new MockupImportError('invalid-json', `The adapter file “${path}” could not be read as JSON.`)
  }
}

function schemaError(path: string): MockupImportError {
  return new MockupImportError('invalid-schema', `The adapter file “${path}” does not match Adapter v1.`)
}

function normalizeScreens(document: AdapterScreenDocument) {
  return Object.entries(document).map(([id, screen]) => ({ id, ...screen }))
}

function normalizeComponents(document: AdapterComponentDocument) {
  return Object.entries(document).map(([id, component]) => ({ id, ...component }))
}

function normalizeStates(document: AdapterStateDocument) {
  return Object.entries(document).flatMap(([screenId, states]) => Object.entries(states).map(([id, state]) => ({ id, screenId, ...state })))
}

export async function importMockupZip(input: Blob | ArrayBuffer | Uint8Array): Promise<ImportedMockup> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(input)
  } catch {
    throw new MockupImportError('invalid-zip', 'The selected file is not a readable ZIP archive.')
  }

  const projectJson = await readJson(zip, '.uilab/project.json')
  if (
    typeof projectJson !== 'object'
    || projectJson === null
    || !('entry' in projectJson)
    || (typeof projectJson.entry === 'string' && projectJson.entry.trim() === '')
  ) {
    throw new MockupImportError('missing-entry', 'The adapter project does not declare project.entry.')
  }

  const projectResult = adapterProjectSchema.safeParse(projectJson)
  if (!projectResult.success) {
    const unsupported = projectResult.error.issues.some((issue) => issue.path[0] === 'formatVersion')
    throw unsupported
      ? new MockupImportError('unsupported-format', 'This mockup uses an unsupported Adapter formatVersion.')
      : schemaError('.uilab/project.json')
  }

  const screensResult = adapterScreensSchema.safeParse(await readJson(zip, '.uilab/screens.json'))
  if (!screensResult.success) throw schemaError('.uilab/screens.json')

  const componentsResult = adapterComponentsSchema.safeParse(await readJson(zip, '.uilab/components.json'))
  if (!componentsResult.success) throw schemaError('.uilab/components.json')

  const tokensResult = adapterTokensSchema.safeParse(await readJson(zip, '.uilab/tokens.json'))
  if (!tokensResult.success) throw schemaError('.uilab/tokens.json')

  const statesResult = adapterStatesSchema.safeParse(await readJson(zip, '.uilab/states.json'))
  if (!statesResult.success) throw schemaError('.uilab/states.json')

  const entryFile = zip.file(projectResult.data.entry)
  if (!entryFile) throw new MockupImportError('entry-not-found', `The preview entry “${projectResult.data.entry}” is not present in the ZIP.`)

  let previewHtml: string
  try {
    previewHtml = await entryFile.async('string')
  } catch {
    throw new MockupImportError('entry-not-found', `The preview entry “${projectResult.data.entry}” could not be read.`)
  }

  return {
    name: projectResult.data.name,
    formatVersion: 1,
    entry: projectResult.data.entry,
    defaultViewport: projectResult.data.defaultViewport,
    screens: normalizeScreens(screensResult.data),
    components: normalizeComponents(componentsResult.data),
    tokens: tokensResult.data,
    states: normalizeStates(statesResult.data),
    previewHtml,
  }
}
