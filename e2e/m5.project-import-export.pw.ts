import { expect, test } from '@playwright/test'
import JSZip from 'jszip'
import fs from 'node:fs/promises'

async function createAdapterZip(): Promise<Buffer> {
  const zip = new JSZip()
  zip.file('.uilab/project.json', JSON.stringify({ formatVersion: 1, name: 'HouseToDo', entry: 'dist/index.html', defaultViewport: { width: 430, height: 700 } }))
  zip.file('.uilab/screens.json', JSON.stringify({ home: { name: 'Home', path: '/home', defaultState: 'normal' } }))
  zip.file('.uilab/components.json', JSON.stringify({
    'Home.TaskRow': { selector: "[data-uilab-component='Home.TaskRow']", instances: 'single', editable: ['position', 'width', 'height', 'background', 'fontSize'] },
  }))
  zip.file('.uilab/tokens.json', JSON.stringify({ color: { accent: '#5874d8' } }))
  zip.file('.uilab/states.json', JSON.stringify({ home: { normal: { name: 'Normal' } } }))
  zip.file('dist/index.html', `<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#f7f9fc}main{position:relative;width:100%;height:100%}[data-uilab-component]{position:absolute;left:54px;top:132px;width:164px;height:72px;display:grid;place-items:center;border-radius:12px;color:#fff;background:#5874d8;font-size:16px}</style></head><body><main><div data-uilab-component="Home.TaskRow" data-uilab-id="task-bird">Task Bird</div></main></body></html>`)
  return zip.generateAsync({ type: 'nodebuffer' })
}

async function createBlankProjectPackage(): Promise<Buffer> {
  const zip = new JSZip()
  const project = {
    formatVersion: 1,
    id: 'blank-project',
    name: 'Blank Project',
    source: { type: 'blank' },
    viewport: { width: 390, height: 844 },
    screens: [],
    components: [],
    tokens: {},
    changes: [],
    editor: {},
  }
  zip.file('project.json', JSON.stringify({ formatVersion: 1, project }))
  zip.file('adapter/project.json', JSON.stringify({ formatVersion: 1, name: 'Blank Project', entry: 'preview/index.html', defaultViewport: project.viewport }))
  zip.file('adapter/screens.json', '{}')
  zip.file('adapter/components.json', '{}')
  zip.file('adapter/tokens.json', '{}')
  zip.file('adapter/states.json', '{}')
  zip.file('preview/index.html', '<!doctype html><html><body></body></html>')
  return zip.generateAsync({ type: 'nodebuffer' })
}

async function commitInput(page: import('@playwright/test').Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true })
  await input.fill(value)
  await input.press('Enter')
}

test('Milestone 5 project export/import restores viewport, preview, and edits', async ({ page }) => {
  await fs.mkdir('docs/screenshots/m5', { recursive: true })
  await page.goto('/')
  await page.getByLabel('Mockup ZIP file').setInputFiles({ name: 'house-todo.zip', mimeType: 'application/zip', buffer: await createAdapterZip() })

  const frame = page.frameLocator('iframe[title="HouseToDo preview"]')
  const bird = frame.locator('[data-uilab-id="task-bird"]')
  await expect(bird).toBeVisible()
  await bird.click()
  await commitInput(page, 'W', '206')
  await commitInput(page, 'Background', '#ffedd5')
  await commitInput(page, 'Font Size', '20')
  await expect(bird).toHaveCSS('background-color', 'rgb(255, 237, 213)')
  await expect(bird).toHaveCSS('font-size', '20px')
  await page.screenshot({ path: 'docs/screenshots/m5/01-project-export.png', fullPage: true })

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Project' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('HouseToDo.ui-project')
  const exported = await fs.readFile((await download.path()) as string)

  await page.getByLabel('UI Lab project file').setInputFiles({ name: 'blank.ui-project', mimeType: 'application/zip', buffer: await createBlankProjectPackage() })
  await expect(page.getByText('No screen selected')).toBeVisible()

  await page.getByLabel('UI Lab project file').setInputFiles({ name: 'HouseToDo.ui-project', mimeType: 'application/zip', buffer: exported })
  await expect(page.getByRole('button', { name: /^Home/ })).toBeVisible()
  await expect(page.getByTestId('viewport-frame')).toHaveAttribute('aria-label', 'Preview viewport 430 by 700')
  await expect(page.locator('iframe[title="HouseToDo preview"]')).toBeVisible()
  await page.screenshot({ path: 'docs/screenshots/m5/02-project-import.png', fullPage: true })

  const restoredFrame = page.frameLocator('iframe[title="HouseToDo preview"]')
  const restoredBird = restoredFrame.locator('[data-uilab-id="task-bird"]')
  await restoredBird.click()
  await expect(page.getByTestId('measurement-width')).toHaveText('206')
  await expect(restoredBird).toHaveCSS('background-color', 'rgb(255, 237, 213)')
  await expect(restoredBird).toHaveCSS('font-size', '20px')
  await page.screenshot({ path: 'docs/screenshots/m5/03-restored-edits.png', fullPage: true })
})
