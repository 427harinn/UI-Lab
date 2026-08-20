import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { createBlankProject } from '../project/blankProject'
import type { ImportedMockup } from '../../schemas/adapter'
import type { UiLabProject } from '../../schemas/project'
import { buildImplementationMarkdown, buildDesignMarkdown, codexExportFilename, resolveFinalCodexChanges, serializeCodexExport } from './export'
import { codexChangesDocumentSchema, codexScreensDocumentSchema } from './schema'
import { previewScopeKey } from './previewCapture'

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])

function createFixture(): { project: UiLabProject; importedMockup: ImportedMockup } {
  const project = createBlankProject()
  project.name = 'HouseToDo'
  project.source = { type: 'mockup', name: 'HouseToDo' }
  project.viewport = { width: 390, height: 844 }
  project.screens = [{ id: 'home', name: 'Home', route: '/home', states: [{ id: 'normal', name: 'Normal' }, { id: 'overdue', name: 'Overdue' }] }]
  project.components = [{ id: 'Home.TaskRow', name: 'Task Row', type: 'row', selector: '[data-task-row]', instances: 'multiple', editableProperties: ['width', 'background', 'fontSize'] }]
  project.tokens = { color: { background: '#FCFBF7' }, spacing: { md: 12 } }
  project.editor = { currentScreenId: 'home', currentStateId: 'normal' }
  const importedMockup: ImportedMockup = {
    name: 'HouseToDo', formatVersion: 1, entry: 'dist/index.html', defaultViewport: project.viewport,
    screens: [{ id: 'home', name: 'Home', path: '/home', defaultState: 'normal' }],
    components: [{ id: 'Home.TaskRow', selector: '[data-task-row]', instances: 'multiple', editable: ['width', 'background', 'fontSize'] }],
    tokens: project.tokens,
    states: [{ id: 'normal', screenId: 'home', name: 'Normal' }, { id: 'overdue', screenId: 'home', name: 'Overdue' }],
    previewHtml: '<!doctype html><html><body><main data-task-row="true">Task</main></body></html>',
  }
  return { project, importedMockup }
}

function addChange(project: UiLabProject, change: Partial<UiLabProject['changes'][number]> & Pick<UiLabProject['changes'][number], 'after' | 'property' | 'elementId'>): void {
  project.changes.push({
    id: crypto.randomUUID(), screenId: 'home', stateId: 'normal', componentId: 'Home.TaskRow', before: 16,
    valueType: 'exact', updatedAt: new Date().toISOString(), ...change,
  })
}

describe('Codex Export', () => {
  it('resolves final values, keeps valueType, and sorts stable records', () => {
    const { project } = createFixture()
    addChange(project, { elementId: 'task-z', property: 'fontSize', before: 16, after: 20, valueType: 'exact' })
    addChange(project, { elementId: 'task-a', property: 'width', before: 164, after: 206, valueType: 'visual' })
    addChange(project, { elementId: 'task-z', property: 'fontSize', before: 20, after: 22, valueType: 'target' })

    expect(resolveFinalCodexChanges(project)).toEqual([
      expect.objectContaining({ instanceId: 'task-a', property: 'width', before: 164, after: 206, valueType: 'visual' }),
      expect.objectContaining({ instanceId: 'task-z', property: 'fontSize', before: 16, after: 22, valueType: 'target' }),
    ])
    expect(codexChangesDocumentSchema.parse({ formatVersion: 1, project: 'HouseToDo', changes: resolveFinalCodexChanges(project) })).toBeTruthy()
  })

  it.each([
    ['stale screen', (project: UiLabProject) => addChange(project, { screenId: 'missing', after: 20, property: 'fontSize', elementId: 'task-a' }), 'screen'],
    ['stale state', (project: UiLabProject) => addChange(project, { stateId: 'missing', after: 20, property: 'fontSize', elementId: 'task-a' }), 'state'],
    ['stale component', (project: UiLabProject) => addChange(project, { componentId: 'Missing.Row', after: 20, property: 'fontSize', elementId: 'task-a' }), 'component'],
  ])('rejects %s targets with a readable error', (_, mutate, label) => {
    const { project } = createFixture()
    mutate(project)
    expect(() => resolveFinalCodexChanges(project)).toThrow(new RegExp(label))
  })

  it('rejects empty changes and generates the required ZIP files', async () => {
    const { project, importedMockup } = createFixture()
    expect(() => resolveFinalCodexChanges(project)).toThrow('No UI changes to export.')
    addChange(project, { elementId: 'task-a', property: 'background', before: '#fff', after: '#ffedd5', valueType: 'exact' })
    const archive = await serializeCodexExport(project, importedMockup, async (requested) => Object.fromEntries(requested.map((scope) => [previewScopeKey(scope), png])))
    const zip = await JSZip.loadAsync(archive)
    for (const path of ['ui-changes.json', 'design-tokens.json', 'screens.json', 'IMPLEMENTATION.md', 'DESIGN.md', 'screenshots/home-normal.png']) {
      expect(zip.file(path)).not.toBeNull()
    }
    const changes = JSON.parse(await zip.file('ui-changes.json')!.async('string')) as unknown
    expect(codexChangesDocumentSchema.parse(changes).changes[0]).toMatchObject({ property: 'background', valueType: 'exact', instanceId: 'task-a' })
    expect(codexScreensDocumentSchema.parse(JSON.parse(await zip.file('screens.json')!.async('string'))).home).toMatchObject({ path: '/home', defaultState: 'normal' })
    expect(await zip.file('design-tokens.json')!.async('string')).toContain('#FCFBF7')
    expect(await zip.file('IMPLEMENTATION.md')!.async('string')).toContain('UI Lab raw coordinates are editor-space measurements')
    expect(await zip.file('DESIGN.md')!.async('string')).toContain('Home.TaskRow')
  })

  it('has a stable filename and rejects screenshot failure', async () => {
    const { project, importedMockup } = createFixture()
    addChange(project, { elementId: 'task-a', property: 'width', before: 164, after: 206, valueType: 'visual' })
    expect(codexExportFilename('HouseToDo / Preview')).toBe('HouseToDo - Preview-ui-changes.zip')
    await expect(serializeCodexExport(project, importedMockup, async () => { throw new Error('capture failed') })).rejects.toThrow('reference screenshot')
  })

  it('generates implementation and design documents with distinct responsibilities', () => {
    const { project, importedMockup } = createFixture()
    addChange(project, { elementId: 'task-a', property: 'width', before: 164, after: 206, valueType: 'visual' })
    const changes = resolveFinalCodexChanges(project)
    expect(buildImplementationMarkdown(project, changes.length)).toContain('semantic component')
    expect(buildDesignMarkdown(project, importedMockup, changes)).toContain('visual result')
  })
})
