import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import type { ImportedMockup } from '../../schemas/adapter'
import { createBlankProject } from './blankProject'
import {
  PROJECT_PACKAGE_FILES,
  ProjectPackageError,
  loadProjectPackage,
  migrateProjectPackageDocument,
  projectFilename,
  serializeProjectPackage,
} from './package'

function createImportedMockup(): ImportedMockup {
  return {
    name: 'HouseToDo',
    formatVersion: 1,
    entry: 'dist/index.html',
    defaultViewport: { width: 430, height: 932 },
    screens: [{ id: 'home', name: 'Home', path: '/home', defaultState: 'normal' }],
    components: [{ id: 'Home.TaskRow', selector: '[data-row]', instances: 'multiple', editable: ['position', 'width', 'background'] }],
    tokens: { color: { accent: '#6f8cff' } },
    states: [{ id: 'normal', screenId: 'home', name: 'Normal' }],
    previewHtml: '<!doctype html><html><body><div data-row data-uilab-id="task-bird">Task Bird</div></body></html>',
  }
}

async function unzip(bytes: Uint8Array): Promise<JSZip> {
  return JSZip.loadAsync(bytes)
}

describe('.ui-project package', () => {
  it('exports all required entries and preserves project, Adapter data, preview, changes, and viewport', async () => {
    const project = createBlankProject()
    project.name = 'HouseToDo'
    project.source = { type: 'mockup', name: 'HouseToDo' }
    project.viewport = { width: 390, height: 844 }
    project.screens = [{ id: 'home', name: 'Home', route: '/home', states: [{ id: 'normal', name: 'Normal' }] }]
    project.components = [{ id: 'Home.TaskRow', name: 'Home.TaskRow', type: 'Home.TaskRow', selector: '[data-row]', instances: 'multiple', editableProperties: ['position', 'width', 'background'] }]
    project.tokens = { color: { accent: '#6f8cff' } }
    project.editor = { currentScreenId: 'home', currentStateId: 'normal' }
    project.changes = [{
      id: 'change-1', screenId: 'home', stateId: 'normal', elementId: 'task-bird', componentId: 'Home.TaskRow',
      property: 'width', before: 120, after: 206, valueType: 'visual', updatedAt: '2026-08-20T00:00:00.000Z',
    }]

    const bytes = await serializeProjectPackage(project, createImportedMockup())
    const zip = await unzip(bytes)
    expect(PROJECT_PACKAGE_FILES.every((path) => Boolean(zip.file(path)))).toBe(true)

    const loaded = await loadProjectPackage(bytes)
    expect(loaded.project).toEqual(project)
    expect(loaded.project.viewport).toEqual({ width: 390, height: 844 })
    expect(loaded.project.changes[0].after).toBe(206)
    expect(loaded.importedMockup).toMatchObject({
      name: 'HouseToDo',
      entry: 'dist/index.html',
      tokens: { color: { accent: '#6f8cff' } },
      previewHtml: expect.stringContaining('Task Bird'),
    })
  })

  it('rejects individually valid packages whose project and Adapter metadata diverge', async () => {
    const project = createBlankProject()
    project.source = { type: 'mockup', name: 'HouseToDo' }
    project.screens = [{ id: 'home', name: 'Home', route: '/home', states: [{ id: 'normal', name: 'Normal' }] }]
    project.components = [{ id: 'Home.TaskRow', name: 'Home.TaskRow', type: 'Home.TaskRow', selector: '[data-row]', instances: 'multiple', editableProperties: ['position', 'width', 'background'] }]
    project.editor = { currentScreenId: 'home', currentStateId: 'normal' }
    const imported = createImportedMockup()

    async function expectMismatch(path: string, update: (value: Record<string, unknown>) => void) {
      const zip = await unzip(await serializeProjectPackage(project, imported))
      const file = zip.file(path)
      if (!file) throw new Error(`Missing test fixture entry ${path}`)
      const value = JSON.parse(await file.async('string')) as Record<string, unknown>
      update(value)
      zip.file(path, JSON.stringify(value))
      await expect(loadProjectPackage(await zip.generateAsync({ type: 'uint8array' }))).rejects.toMatchObject({ code: 'schema-mismatch' })
    }

    await expectMismatch('adapter/components.json', (value) => {
      const components = value['Home.TaskRow'] as Record<string, unknown>
      components.editable = ['width']
    })
    await expectMismatch('adapter/screens.json', (value) => {
      const home = value.home as Record<string, unknown>
      home.path = '/different'
    })
    await expectMismatch('adapter/tokens.json', (value) => { value.color = { accent: '#000' } })
    await expectMismatch('adapter/states.json', (value) => {
      const home = value.home as Record<string, unknown>
      home.normal = { name: 'Changed' }
    })
  })

  it('round-trips a blank project without inventing editor screens', async () => {
    const project = createBlankProject()
    const loaded = await loadProjectPackage(await serializeProjectPackage(project))

    expect(loaded.project).toEqual(project)
    expect(loaded.importedMockup).toBeUndefined()
  })

  it('does not export a persisted mockup project when its transient preview is unavailable', async () => {
    const project = createBlankProject()
    project.source = { type: 'mockup', name: 'Re-import required' }
    await expect(serializeProjectPackage(project)).rejects.toMatchObject({ code: 'missing-preview' })
  })

  it('reports invalid ZIP, missing project, missing Adapter data, corrupted JSON, and schema mismatch', async () => {
    await expect(loadProjectPackage(new Uint8Array([1, 2, 3]))).rejects.toMatchObject({ code: 'invalid-zip' })

    const emptyZip = new JSZip()
    await expect(loadProjectPackage(await emptyZip.generateAsync({ type: 'uint8array' }))).rejects.toMatchObject({ code: 'missing-project' })

    const valid = await serializeProjectPackage(createBlankProject())
    const missingAdapter = await unzip(valid)
    missingAdapter.remove('adapter/tokens.json')
    await expect(loadProjectPackage(await missingAdapter.generateAsync({ type: 'uint8array' }))).rejects.toMatchObject({ code: 'missing-adapter' })

    const corrupted = await unzip(valid)
    corrupted.file('project.json', '{bad-json')
    await expect(loadProjectPackage(await corrupted.generateAsync({ type: 'uint8array' }))).rejects.toMatchObject({ code: 'invalid-json' })

    const mismatched = await unzip(valid)
    mismatched.file('project.json', JSON.stringify({ formatVersion: 1, project: { ...createBlankProject(), viewport: { width: 0, height: 0 } } }))
    await expect(loadProjectPackage(await mismatched.generateAsync({ type: 'uint8array' }))).rejects.toMatchObject({ code: 'schema-mismatch' })
  })

  it('rejects unsupported package versions and missing preview with readable errors', async () => {
    const bytes = await serializeProjectPackage(createBlankProject())
    const unsupported = await unzip(bytes)
    unsupported.file('project.json', JSON.stringify({ formatVersion: 2, project: createBlankProject() }))
    await expect(loadProjectPackage(await unsupported.generateAsync({ type: 'uint8array' }))).rejects.toEqual(expect.objectContaining({
      code: 'unsupported-format',
      message: expect.stringContaining('formatVersion 2'),
    } satisfies Partial<ProjectPackageError>))

    const missingPreview = await unzip(bytes)
    missingPreview.remove('preview/index.html')
    await expect(loadProjectPackage(await missingPreview.generateAsync({ type: 'uint8array' }))).rejects.toMatchObject({ code: 'missing-preview' })
  })

  it('exposes a v1 migration entry point and sanitizes filenames', () => {
    const document = { formatVersion: 1, project: createBlankProject() }
    expect(migrateProjectPackageDocument(document)).toBe(document)
    expect(() => migrateProjectPackageDocument({ formatVersion: 2 })).toThrowError(/unsupported formatVersion 2/)
    expect(projectFilename(' House/ToDo: * ')).toBe('House-ToDo- -.ui-project')
    expect(projectFilename('')).toBe('Untitled UI Project.ui-project')
  })
})
