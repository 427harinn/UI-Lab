import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { importMockupZip, MockupImportError } from './importer'

const files = {
  '.uilab/project.json': {
    formatVersion: 1,
    name: 'Synthetic mockup',
    entry: 'dist/index.html',
    defaultViewport: { width: 375, height: 812 },
  },
  '.uilab/screens.json': {
    screens: [{ id: 'home', name: 'Home', path: '/home', defaultState: 'normal' }],
  },
  '.uilab/components.json': {
    components: [{ id: 'card', name: 'Card', type: 'Card', instances: 'multiple', editableProperties: ['width'] }],
  },
  '.uilab/tokens.json': { tokens: { colorAccent: '#f00' } },
  '.uilab/states.json': {
    states: [
      { id: 'normal', name: 'Normal', screenId: 'home' },
      { id: 'overdue', name: 'Overdue', screenId: 'home' },
    ],
  },
  'dist/index.html': '<!doctype html><html><body><main>Preview</main></body></html>',
}

type FixtureValue = string | object

async function makeZip(overrides: Partial<Record<keyof typeof files, FixtureValue>> = {}): Promise<Uint8Array> {
  const zip = new JSZip()
  const content = { ...files, ...overrides }
  for (const [path, value] of Object.entries(content)) {
    zip.file(path, typeof value === 'string' ? value : JSON.stringify(value))
  }
  return zip.generateAsync({ type: 'uint8array' })
}

describe('mockup ZIP importer', () => {
  it('imports a valid Adapter v1 package and keeps preview HTML transient', async () => {
    const imported = await importMockupZip(await makeZip())

    expect(imported).toMatchObject({
      name: 'Synthetic mockup',
      entry: 'dist/index.html',
      defaultViewport: { width: 375, height: 812 },
      screens: [{ id: 'home' }],
      states: [{ id: 'normal' }, { id: 'overdue' }],
      components: [{ id: 'card' }],
    })
    expect(imported.previewHtml).toContain('Preview')
  })

  it('reports invalid ZIP, missing adapter files, invalid JSON, unsupported format, and missing entry', async () => {
    await expect(importMockupZip(new Uint8Array([1, 2, 3]))).rejects.toMatchObject({ code: 'invalid-zip' })

    const missing = await makeZip()
    const missingZip = await JSZip.loadAsync(missing)
    missingZip.remove('.uilab/states.json')
    await expect(importMockupZip(await missingZip.generateAsync({ type: 'uint8array' }))).rejects.toMatchObject({ code: 'missing-file' })

    await expect(importMockupZip(await makeZip({ '.uilab/project.json': '{bad-json' }))).rejects.toMatchObject({ code: 'invalid-json' })
    await expect(importMockupZip(await makeZip({ '.uilab/project.json': { ...files['.uilab/project.json'], formatVersion: 2 } }))).rejects.toMatchObject({ code: 'unsupported-format' })
    await expect(importMockupZip(await makeZip({ '.uilab/project.json': { ...files['.uilab/project.json'], entry: '' } }))).rejects.toMatchObject({ code: 'missing-entry' })
    await expect(importMockupZip(await makeZip({ '.uilab/project.json': { ...files['.uilab/project.json'], entry: 'dist/missing.html' } }))).rejects.toMatchObject({ code: 'entry-not-found' })
  })

  it('reports invalid adapter schemas with a readable error', async () => {
    await expect(importMockupZip(await makeZip({
      '.uilab/components.json': {
        components: [{ id: 'card', name: 'Card', type: 'Card', instances: 'single', editableProperties: ['transform'] }],
      },
    }))).rejects.toEqual(expect.objectContaining({
      code: 'invalid-schema',
      message: expect.stringContaining('.uilab/components.json'),
    } satisfies Partial<MockupImportError>))
  })
})
