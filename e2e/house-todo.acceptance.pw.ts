import { expect, test, type Locator, type Page } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import JSZip from 'jszip'
import { loadHouseToDoFixture, ids, stateIdsByScreen, type AdapterFixture } from './helpers/adapterFixture'
import { commitInspectorValue, readInspectorValue, rgbFromHex } from './helpers/inspector'

const evidenceDirectory = path.resolve(process.cwd(), 'docs/screenshots/m8')

function iframeFor(page: Page): Locator {
  return page.locator('iframe.preview-frame')
}

function exactText(value: string): RegExp {
  return new RegExp(`^${value.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}$`)
}

function screenButton(page: Page, fixture: AdapterFixture, screenId: string): Locator {
  const screen = fixture.screens.find((item) => item.id === screenId)
  if (!screen) throw new Error(`Unknown Adapter screen ${screenId}`)
  return page.locator('section[aria-labelledby="screens-heading"] button.navigator-item').filter({ has: page.locator('.navigator-item__meta').filter({ hasText: exactText(screen.path) }) })
}

function stateButton(page: Page, fixture: AdapterFixture, screenId: string, stateId: string): Locator {
  const state = fixture.states.find((item) => item.screenId === screenId && item.id === stateId)
  if (!state) throw new Error(`Unknown Adapter state ${screenId}/${stateId}`)
  return page.locator('section[aria-labelledby="states-heading"] button.navigator-item').filter({ has: page.locator('.navigator-item__meta').filter({ hasText: exactText(stateId) }) })
}

async function expectPreviewRoute(page: Page, fixture: AdapterFixture, screenId: string, stateId: string): Promise<void> {
  const screen = fixture.screens.find((item) => item.id === screenId)
  if (!screen) throw new Error(`Unknown Adapter screen ${screenId}`)
  const iframe = iframeFor(page)
  const expectedHash = `#${screen.path}?uilabState=${encodeURIComponent(stateId)}`
  await expect(iframe).toBeVisible()
  await expect.poll(async () => iframe.evaluate((element) => new URL((element as HTMLIFrameElement).src, document.baseURI).hash)).toBe(expectedHash)

  const frame = page.frameLocator('iframe.preview-frame')
  await expect(frame.locator('body')).toBeVisible()
  await expect.poll(async () => frame.locator('body').evaluate((body) => body.innerHTML.trim().length)).toBeGreaterThan(0)
  await expect.poll(async () => frame.locator('body').evaluate((body) => Boolean(body.firstElementChild))).toBe(true)
}

async function selectScreenState(page: Page, fixture: AdapterFixture, screenId: string, stateId: string): Promise<void> {
  await screenButton(page, fixture, screenId).click()
  await stateButton(page, fixture, screenId, stateId).click()
  await expectPreviewRoute(page, fixture, screenId, stateId)
  await expect(page.getByTestId('selection-summary')).toHaveCount(0)
}

function adapterTarget(fixture: AdapterFixture, componentId: string, instanceId: string): string {
  const component = fixture.components.find((item) => item.id === componentId)
  if (!component) throw new Error(`Unknown Adapter component ${componentId}`)
  if (!component.selector.includes('data-uilab-component')) throw new Error(`Unexpected selector for ${componentId}`)
  return `[data-uilab-component="${componentId}"][data-uilab-id="${instanceId}"]`
}

async function selectTarget(page: Page, fixture: AdapterFixture, componentId: string, instanceId: string): Promise<Locator> {
  const frame = page.frameLocator('iframe.preview-frame')
  const target = frame.locator(adapterTarget(fixture, componentId, instanceId))
  await expect(target).toBeVisible()
  await expect(target).toHaveAttribute('data-uilab-component', componentId)
  await expect(target).toHaveAttribute('data-uilab-id', instanceId)
  await target.dispatchEvent('click')
  await expect(page.getByTestId('selection-summary')).toContainText(componentId)
  await expect(page.getByTestId('selected-instance-id')).toHaveText(instanceId)
  return target
}

async function readProjectPackage(downloadPath: string) {
  const archive = await JSZip.loadAsync(await fs.readFile(downloadPath))
  const projectFile = archive.file('project.json')
  if (!projectFile) throw new Error('Project export is missing project.json')
  return {
    archive,
    project: JSON.parse(await projectFile.async('string')) as {
      project: {
        viewport: { width: number; height: number }
        screens: Array<{ id: string; states: Array<{ id: string }> }>
        components: Array<{ id: string }>
        editor: { currentScreenId?: string; currentStateId?: string }
        changes: Array<Record<string, unknown>>
      }
    },
  }
}

test('HouseToDo pinned Adapter covers import, all screens/states, editing, history, project round trip, and Codex Export', async ({ page }) => {
  const fixture = await loadHouseToDoFixture()
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await fs.mkdir(evidenceDirectory, { recursive: true })
  await page.goto('/')
  await page.getByLabel('Mockup ZIP file').setInputFiles(fixture.zipPath)

  await expect(page.getByText('Mockup imported', { exact: true })).toBeVisible()
  await expect(page.getByTestId('viewport-frame')).toHaveAttribute('aria-label', `Preview viewport ${fixture.project.defaultViewport.width} by ${fixture.project.defaultViewport.height}`)
  await expectPreviewRoute(page, fixture, fixture.screens[0].id, fixture.screens[0].defaultState)
  await page.screenshot({ path: path.join(evidenceDirectory, '01-house-todo-imported.png'), fullPage: true })

  // Import validation is metadata-driven: the navigator must expose the exact Adapter ID sets.
  const navigatorScreenPaths = await page.locator('section[aria-labelledby="screens-heading"] .navigator-item__meta').allTextContents()
  const navigatorScreenIds = navigatorScreenPaths.map((route) => fixture.screens.find((screen) => screen.path === route)?.id ?? route)
  expect(navigatorScreenIds.sort()).toEqual(ids(fixture.screens))
  await selectScreenState(page, fixture, fixture.screens[0].id, fixture.screens[0].defaultState)

  // Every Adapter screen and every declared state must produce its own routed, non-blank preview.
  for (const screen of fixture.screens) {
    for (const state of fixture.states.filter((item) => item.screenId === screen.id)) {
      await selectScreenState(page, fixture, screen.id, state.id)
    }
  }

  // The two representative targets prove discovery is refreshed after screen/state transitions.
  await selectScreenState(page, fixture, 'home', 'normal')
  const homeRow = await selectTarget(page, fixture, 'Home.TaskRow', 'normal-trash')
  const beforeBackground = await readInspectorValue(page, 'Background')
  const beforeBackgroundCss = await homeRow.evaluate((element) => element.ownerDocument.defaultView?.getComputedStyle(element).backgroundColor ?? '')
  expect(beforeBackground).not.toBe('')
  expect(beforeBackgroundCss).not.toBe('')
  await commitInspectorValue(page, 'Background', '#eef8f1')
  await expect(homeRow).toHaveCSS('background-color', rgbFromHex('#eef8f1'))
  await expect(page.getByTestId('selection-summary')).toContainText('Home')

  await selectScreenState(page, fixture, 'task-add', 'normal')
  const taskName = await selectTarget(page, fixture, 'TaskForm.Name', 'task-form-name')
  const beforeFontSize = Number(await readInspectorValue(page, 'Font Size'))
  expect(Number.isFinite(beforeFontSize)).toBe(true)
  await commitInspectorValue(page, 'Font Size', 19)
  await expect(taskName).toHaveCSS('font-size', '19px')
  await expect(page.getByTestId('dirty-indicator')).toContainText('2 changes')
  await page.screenshot({ path: path.join(evidenceDirectory, '02-house-todo-edited.png'), fullPage: true })

  // Undo/redo must restore and re-apply both real-mockup edits, including their project change state.
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(taskName).toHaveCSS('font-size', `${beforeFontSize}px`)
  await expect(page.getByTestId('dirty-indicator')).toContainText('1 changes')
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(taskName).toHaveCSS('font-size', '19px')
  await expect(page.getByTestId('dirty-indicator')).toContainText('2 changes')

  await page.getByRole('button', { name: 'Undo' }).click()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByTestId('dirty-indicator')).toHaveCount(0)
  await selectScreenState(page, fixture, 'home', 'normal')
  const restoredHomeRow = await selectTarget(page, fixture, 'Home.TaskRow', 'normal-trash')
  await expect(restoredHomeRow).toHaveCSS('background-color', beforeBackgroundCss)
  await page.getByRole('button', { name: 'Redo' }).click()
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(page.getByTestId('dirty-indicator')).toContainText('2 changes')
  await selectScreenState(page, fixture, 'home', 'normal')
  await expect((await selectTarget(page, fixture, 'Home.TaskRow', 'normal-trash'))).toHaveCSS('background-color', rgbFromHex('#eef8f1'))
  await selectScreenState(page, fixture, 'task-add', 'normal')
  await expect((await selectTarget(page, fixture, 'TaskForm.Name', 'task-form-name'))).toHaveCSS('font-size', '19px')
  await page.getByTestId('selection-summary').press('Escape')

  // Project package round trip: inspect its serialized metadata and restore the active task-add/normal scope.
  const projectDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Project' }).click()
  const projectDownload = await projectDownloadPromise
  const projectPath = path.join('test-results', 'house-todo-acceptance', 'HouseToDo.ui-project')
  await fs.mkdir(path.dirname(projectPath), { recursive: true })
  await projectDownload.saveAs(projectPath)
  const exportedProject = await readProjectPackage(projectPath)
  const restoredProject = exportedProject.project.project
  expect(restoredProject.viewport).toEqual(fixture.project.defaultViewport)
  expect(ids(restoredProject.screens)).toEqual(ids(fixture.screens))
  expect(Object.fromEntries(restoredProject.screens.map((screen) => [screen.id, screen.states.map((state) => state.id).sort()]))).toEqual(stateIdsByScreen(fixture.states))
  expect(ids(restoredProject.components)).toEqual(ids(fixture.components))
  expect(restoredProject.editor).toMatchObject({ currentScreenId: 'task-add', currentStateId: 'normal' })
  expect(restoredProject.changes).toHaveLength(2)

  await page.getByLabel('UI Lab project file').setInputFiles(projectPath)
  await expect(page.getByText('Project imported', { exact: true })).toBeVisible()
  await expect(page.getByTestId('viewport-frame')).toHaveAttribute('aria-label', `Preview viewport ${fixture.project.defaultViewport.width} by ${fixture.project.defaultViewport.height}`)
  await expectPreviewRoute(page, fixture, 'task-add', 'normal')
  await expect(page.getByTestId('dirty-indicator')).toContainText('2 changes')
  await expect((await selectTarget(page, fixture, 'TaskForm.Name', 'task-form-name'))).toHaveCSS('font-size', '19px')
  await selectScreenState(page, fixture, 'home', 'normal')
  await expect((await selectTarget(page, fixture, 'Home.TaskRow', 'normal-trash'))).toHaveCSS('background-color', rgbFromHex('#eef8f1'))
  await page.screenshot({ path: path.join(evidenceDirectory, '03-house-todo-restored.png'), fullPage: true })

  // Codex Export must contain only semantic, final change records and valid reference PNGs.
  const codexDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export for Codex' }).click()
  const codexDownload = await codexDownloadPromise
  const codexPath = path.join('test-results', 'house-todo-acceptance', 'HouseToDo-ui-changes.zip')
  await codexDownload.saveAs(codexPath)
  const codexArchive = await JSZip.loadAsync(await fs.readFile(codexPath))
  const requiredEntries = [
    'manifest.json',
    'ui-changes.json',
    'design-tokens.json',
    'screens.json',
    'IMPLEMENTATION.md',
    'DESIGN.md',
  ]
  for (const entry of requiredEntries) expect(codexArchive.file(entry)).not.toBeNull()
  const uiChangesFile = codexArchive.file('ui-changes.json')
  if (!uiChangesFile) throw new Error('Codex Export is missing ui-changes.json')
  const uiChanges = JSON.parse(await uiChangesFile.async('string')) as { changes: Array<Record<string, unknown>> }
  expect(uiChanges.changes).toEqual(expect.arrayContaining([
    expect.objectContaining({ screenId: 'home', stateId: 'normal', componentId: 'Home.TaskRow', instanceId: 'normal-trash', property: 'background', before: beforeBackground, after: '#eef8f1', valueType: 'exact' }),
    expect.objectContaining({ screenId: 'task-add', stateId: 'normal', componentId: 'TaskForm.Name', instanceId: 'task-form-name', property: 'fontSize', before: beforeFontSize, after: 19, valueType: 'exact' }),
  ]))
  for (const change of uiChanges.changes) {
    expect(change).toEqual(expect.objectContaining({ screenId: expect.any(String), stateId: expect.any(String), componentId: expect.any(String), instanceId: expect.any(String), property: expect.any(String), valueType: expect.any(String) }))
    expect(change).toHaveProperty('before')
    expect(change).toHaveProperty('after')
    expect(change).not.toHaveProperty('updatedAt')
    expect(change).not.toHaveProperty('editor')
  }
  for (const screenshot of ['screenshots/home-normal.png', 'screenshots/task-add-normal.png']) {
    const file = codexArchive.file(screenshot)
    expect(file).not.toBeNull()
    const bytes = await file!.async('uint8array')
    expect([...bytes.slice(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(bytes.length).toBeGreaterThan(8)
  }
  await page.screenshot({ path: path.join(evidenceDirectory, '04-house-todo-codex-export.png'), fullPage: true })

  expect(pageErrors, `HouseToDo preview reported fatal runtime errors: ${pageErrors.join('; ')}`).toEqual([])
})
