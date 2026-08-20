import JSZip from 'jszip'
import { z } from 'zod'
import {
  adapterComponentsSchema,
  adapterProjectSchema,
  adapterScreensSchema,
  adapterStatesSchema,
  adapterTokensSchema,
  type AdapterComponentDocument,
  type AdapterProject,
  type AdapterScreenDocument,
  type AdapterStateDocument,
  type ImportedMockup,
} from '../../schemas/adapter'
import { uiLabProjectSchema, type UiLabProject } from '../../schemas/project'

export const PROJECT_PACKAGE_FORMAT_VERSION = 1 as const
export const PROJECT_PACKAGE_FILES = [
  'project.json',
  'adapter/project.json',
  'adapter/screens.json',
  'adapter/components.json',
  'adapter/tokens.json',
  'adapter/states.json',
  'preview/index.html',
] as const

type JsonRecord = Record<string, unknown>

const zScreenDefinition = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  defaultState: z.string().min(1),
}).strict()

const zStateDefinition = z.object({ name: z.string().min(1) }).strict()

// Keeping package-only empty adapter documents separate from the external
// Adapter contract lets a blank UI Lab project round-trip without inventing a screen.
const packageScreensSchema = z.record(z.string().min(1), zScreenDefinition)
const packageStatesSchema = z.record(z.string().min(1), z.record(z.string().min(1), zStateDefinition))

export const projectPackageDocumentSchema = z.object({
  formatVersion: z.literal(PROJECT_PACKAGE_FORMAT_VERSION),
  project: uiLabProjectSchema,
}).strict()

export type ProjectPackageDocument = z.infer<typeof projectPackageDocumentSchema>

export type ProjectPackageImportErrorCode =
  | 'invalid-zip'
  | 'missing-project'
  | 'invalid-json'
  | 'unsupported-format'
  | 'missing-adapter'
  | 'missing-preview'
  | 'schema-mismatch'

export class ProjectPackageError extends Error {
  readonly code: ProjectPackageImportErrorCode

  constructor(code: ProjectPackageImportErrorCode, message: string) {
    super(message)
    this.name = 'ProjectPackageError'
    this.code = code
  }
}

export interface LoadedProjectPackage {
  project: UiLabProject
  importedMockup?: ImportedMockup
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJson(text: string, path: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new ProjectPackageError('invalid-json', `Project package file “${path}” contains invalid JSON.`)
  }
}

async function loadZip(input: Blob | ArrayBuffer | Uint8Array): Promise<JSZip> {
  try {
    return await JSZip.loadAsync(input)
  } catch {
    throw new ProjectPackageError('invalid-zip', 'The selected project file is not a readable ZIP archive.')
  }
}

async function readRequiredJson(zip: JSZip, path: string, code: ProjectPackageImportErrorCode = 'missing-adapter'): Promise<unknown> {
  const file = zip.file(path)
  if (!file) {
    const message = path === 'project.json'
      ? 'The project package is missing required project.json.'
      : `The project package is missing required Adapter data “${path}”.`
    throw new ProjectPackageError(code, message)
  }
  try {
    return parseJson(await file.async('string'), path)
  } catch (error) {
    if (error instanceof ProjectPackageError) throw error
    throw new ProjectPackageError('invalid-json', `Project package file “${path}” could not be read as JSON.`)
  }
}

async function readPreview(zip: JSZip): Promise<string> {
  const file = zip.file('preview/index.html')
  if (!file) throw new ProjectPackageError('missing-preview', 'The project package is missing preview/index.html.')
  try {
    const html = await file.async('string')
    if (!html.trim()) throw new ProjectPackageError('missing-preview', 'The project package preview is empty.')
    return html
  } catch (error) {
    if (error instanceof ProjectPackageError) throw error
    throw new ProjectPackageError('missing-preview', 'The project package preview could not be read.')
  }
}

function schemaMismatch(path: string): ProjectPackageError {
  return new ProjectPackageError('schema-mismatch', `Project package file “${path}” does not match the .ui-project v1 schema.`)
}

/** Migration entry point. v1 is already the current schema; future versions belong here. */
export function migrateProjectPackageDocument(document: unknown): unknown {
  if (!isRecord(document) || typeof document.formatVersion !== 'number') {
    throw schemaMismatch('project.json')
  }
  if (document.formatVersion !== PROJECT_PACKAGE_FORMAT_VERSION) {
    throw new ProjectPackageError('unsupported-format', `This project package uses unsupported formatVersion ${String(document.formatVersion)}.`)
  }
  return document
}

function normalizeScreens(document: AdapterScreenDocument): ImportedMockup['screens'] {
  return Object.entries(document).map(([id, screen]) => ({ id, ...screen }))
}

function normalizeComponents(document: AdapterComponentDocument): ImportedMockup['components'] {
  return Object.entries(document).map(([id, component]) => ({ id, ...component }))
}

function normalizeStates(document: AdapterStateDocument): ImportedMockup['states'] {
  return Object.entries(document).flatMap(([screenId, states]) => Object.entries(states).map(([id, state]) => ({ id, screenId, ...state })))
}

function validateAdapterDocuments(
  project: UiLabProject,
  adapterProject: unknown,
  adapterScreens: unknown,
  adapterComponents: unknown,
  adapterTokens: unknown,
  adapterStates: unknown,
): {
  project: AdapterProject
  screens: AdapterScreenDocument
  components: AdapterComponentDocument
  tokens: Record<string, unknown>
  states: AdapterStateDocument
} {
  const projectResult = adapterProjectSchema.safeParse(adapterProject)
  if (!projectResult.success) {
    if (isRecord(adapterProject) && adapterProject.formatVersion !== 1) {
      throw new ProjectPackageError('unsupported-format', 'The project package contains unsupported Adapter formatVersion data.')
    }
    throw schemaMismatch('adapter/project.json')
  }

  const screensResult = (project.source.type === 'mockup' ? adapterScreensSchema : packageScreensSchema).safeParse(adapterScreens)
  if (!screensResult.success) throw schemaMismatch('adapter/screens.json')
  const componentsResult = adapterComponentsSchema.safeParse(adapterComponents)
  if (!componentsResult.success) throw schemaMismatch('adapter/components.json')
  const tokensResult = adapterTokensSchema.safeParse(adapterTokens)
  if (!tokensResult.success) throw schemaMismatch('adapter/tokens.json')
  const statesResult = (project.source.type === 'mockup' ? adapterStatesSchema : packageStatesSchema).safeParse(adapterStates)
  if (!statesResult.success) throw schemaMismatch('adapter/states.json')

  return {
    project: projectResult.data,
    screens: screensResult.data,
    components: componentsResult.data,
    tokens: tokensResult.data,
    states: statesResult.data,
  }
}

export function stableJson(value: unknown): string {
  const canonicalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(canonicalize)
    if (!isRecord(input)) return input
    return Object.fromEntries(Object.keys(input).sort().map((key) => [key, canonicalize(input[key])]))
  }
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`
}

function sortedEntries<T>(entries: Array<[string, T]>): Array<[string, T]> {
  return [...entries].sort(([first], [second]) => first.localeCompare(second))
}

function toAdapterDocuments(project: UiLabProject, importedMockup?: ImportedMockup) {
  if (importedMockup) {
    const screens = Object.fromEntries(sortedEntries(importedMockup.screens.map((screen) => [screen.id, {
      name: screen.name,
      path: screen.path,
      defaultState: screen.defaultState,
    }])))
    const components = Object.fromEntries(sortedEntries(importedMockup.components.map((component) => [component.id, {
      selector: component.selector,
      instances: component.instances,
      editable: [...component.editable],
    }])))
    const states = Object.fromEntries(sortedEntries(importedMockup.screens.map((screen) => [screen.id,
      Object.fromEntries(sortedEntries(importedMockup.states.filter((state) => state.screenId === screen.id).map((state) => [state.id, { name: state.name }])))
    ])))
    return {
      project: {
        formatVersion: 1 as const,
        name: importedMockup.name,
        entry: importedMockup.entry,
        defaultViewport: importedMockup.defaultViewport,
      },
      screens,
      components,
      tokens: importedMockup.tokens,
      states,
      previewHtml: importedMockup.previewHtml,
    }
  }

  const screens = Object.fromEntries(sortedEntries(project.screens.map((screen) => [screen.id, {
    name: screen.name,
    path: screen.route ?? `/${screen.id}`,
    defaultState: screen.states[0]?.id ?? 'default',
  }])))
  const components = Object.fromEntries(sortedEntries(project.components.flatMap((component) => component.selector && component.instances
    ? [[component.id, { selector: component.selector, instances: component.instances, editable: [...component.editableProperties] }] as const]
    : [])))
  const states = Object.fromEntries(sortedEntries(project.screens.map((screen) => [screen.id,
    Object.fromEntries(sortedEntries(screen.states.map((state) => [state.id, { name: state.name }])))
  ])))
  return {
    project: {
      formatVersion: 1 as const,
      name: project.name,
      entry: 'preview/index.html',
      defaultViewport: project.viewport,
    },
    screens,
    components,
    tokens: project.tokens,
    states,
    previewHtml: '<!doctype html><html><body></body></html>',
  }
}

export async function serializeProjectPackage(project: UiLabProject, importedMockup?: ImportedMockup): Promise<Uint8Array> {
  const projectResult = uiLabProjectSchema.safeParse(project)
  if (!projectResult.success) throw new ProjectPackageError('schema-mismatch', 'The current project is not valid and cannot be exported.')
  if (projectResult.data.source.type === 'mockup' && !importedMockup) {
    throw new ProjectPackageError('missing-preview', 'The imported preview is not available. Re-import the mockup before exporting this project.')
  }
  const adapter = toAdapterDocuments(projectResult.data, importedMockup)
  const zip = new JSZip()
  const fileOptions = { date: new Date(0) }
  zip.file('project.json', stableJson({ formatVersion: PROJECT_PACKAGE_FORMAT_VERSION, project: projectResult.data }), fileOptions)
  zip.file('adapter/project.json', stableJson(adapter.project), fileOptions)
  zip.file('adapter/screens.json', stableJson(adapter.screens), fileOptions)
  zip.file('adapter/components.json', stableJson(adapter.components), fileOptions)
  zip.file('adapter/tokens.json', stableJson(adapter.tokens), fileOptions)
  zip.file('adapter/states.json', stableJson(adapter.states), fileOptions)
  zip.file('preview/index.html', adapter.previewHtml, fileOptions)
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 }, platform: 'DOS' })
}

export async function loadProjectPackage(input: Blob | ArrayBuffer | Uint8Array): Promise<LoadedProjectPackage> {
  const zip = await loadZip(input)
  const projectJson = await readRequiredJson(zip, 'project.json', 'missing-project')
  const migrated = migrateProjectPackageDocument(projectJson)
  const projectResult = projectPackageDocumentSchema.safeParse(migrated)
  if (!projectResult.success) throw schemaMismatch('project.json')

  const adapterProject = await readRequiredJson(zip, 'adapter/project.json')
  const adapterScreens = await readRequiredJson(zip, 'adapter/screens.json')
  const adapterComponents = await readRequiredJson(zip, 'adapter/components.json')
  const adapterTokens = await readRequiredJson(zip, 'adapter/tokens.json')
  const adapterStates = await readRequiredJson(zip, 'adapter/states.json')
  const previewHtml = await readPreview(zip)
  const adapter = validateAdapterDocuments(projectResult.data.project, adapterProject, adapterScreens, adapterComponents, adapterTokens, adapterStates)

  const importedMockup = projectResult.data.project.source.type === 'mockup'
    ? {
      name: adapter.project.name,
      formatVersion: 1 as const,
      entry: adapter.project.entry,
      defaultViewport: adapter.project.defaultViewport,
      screens: normalizeScreens(adapter.screens),
      components: normalizeComponents(adapter.components),
      tokens: adapter.tokens,
      states: normalizeStates(adapter.states),
      previewHtml,
    }
    : undefined

  return { project: projectResult.data.project, importedMockup }
}

export function projectFilename(projectName: string): string {
  const safe = projectName.normalize('NFKC').trim().replace(/[<>:"/\\|?*]/g, '-').split('').filter((character) => character.charCodeAt(0) >= 32).join('').replace(/\s+/g, ' ').replace(/[. ]+$/g, '')
  return `${safe || 'Untitled UI Project'}.ui-project`
}
