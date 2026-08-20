import { expect, test } from '@playwright/test'
import JSZip from 'jszip'
import fs from 'node:fs/promises'

async function createQualityAdapterZip(): Promise<Buffer> {
  const zip = new JSZip()
  zip.file('.uilab/project.json', JSON.stringify({ formatVersion: 1, name: 'M7 Quality', entry: 'dist/index.html', defaultViewport: { width: 390, height: 844 } }))
  zip.file('.uilab/screens.json', JSON.stringify({ home: { name: 'Home', path: '/home', defaultState: 'normal' } }))
  zip.file('.uilab/components.json', JSON.stringify({
    'Home.TaskRow': { selector: "[data-uilab-component='Home.TaskRow']", instances: 'single', editable: ['position', 'width', 'height', 'background', 'fontSize'] },
  }))
  zip.file('.uilab/tokens.json', JSON.stringify({ color: { accent: '#5874d8' } }))
  zip.file('.uilab/states.json', JSON.stringify({ home: { normal: { name: 'Normal' } } }))
  zip.file('dist/index.html', `<!doctype html><html><head><style>
    * { box-sizing: border-box; } body { margin: 0; width: 390px; height: 844px; background: #f4f6fb; font-family: Arial, sans-serif; }
    [data-uilab-component] { position: absolute; left: 54px; top: 132px; width: 164px; height: 72px; display: grid; place-items: center; border-radius: 12px; color: white; background: #5874d8; font-size: 16px; }
    input { position: absolute; left: 24px; top: 24px; width: 180px; padding: 6px; }
  </style></head><body><main><input aria-label="Native preview input" placeholder="Preview input" /><div data-uilab-component="Home.TaskRow" data-uilab-id="task-bird">Task Bird</div></main></body></html>`)
  return zip.generateAsync({ type: 'nodebuffer' })
}

test('Milestone 7 visual regression states and editing safety', async ({ page }) => {
  await fs.mkdir('docs/screenshots/m7', { recursive: true })
  await page.goto('/')
  await expect(page).toHaveScreenshot('editor-blank.png', { fullPage: true, animations: 'disabled', caret: 'hide' })
  await page.screenshot({ path: 'docs/screenshots/m7/01-editor-polish.png', fullPage: true })

  await page.getByLabel('Mockup ZIP file').setInputFiles({ name: 'm7-quality.zip', mimeType: 'application/zip', buffer: await createQualityAdapterZip() })
  const frame = page.frameLocator('iframe[title="M7 Quality preview"]')
  const target = frame.locator('[data-uilab-id="task-bird"]')
  await target.click()
  await expect(page.getByTestId('selection-summary')).toBeVisible()
  await expect(page).toHaveScreenshot('editor-selected.png', { fullPage: true, animations: 'disabled', caret: 'hide' })

  await page.getByLabel('W', { exact: true }).fill('206')
  await page.getByLabel('W', { exact: true }).press('Enter')
  await expect(page.getByTestId('dirty-indicator')).toContainText('1 changes')
  await expect(page).toHaveScreenshot('editor-edited.png', { fullPage: true, animations: 'disabled', caret: 'hide' })
  await page.screenshot({ path: 'docs/screenshots/m7/03-status-feedback.png', fullPage: true })

  await page.getByRole('button', { name: 'Import Mockup' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.screenshot({ path: 'docs/screenshots/m7/02-confirm-dialog.png', fullPage: true })
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByTestId('dirty-indicator')).toContainText('1 changes')

  await page.keyboard.press('Control+Z')
  await expect(page.getByTestId('dirty-indicator')).not.toBeVisible()
  await page.keyboard.press('Control+Shift+Z')
  await expect(page.getByTestId('dirty-indicator')).toContainText('1 changes')
})

test('Milestone 7 Codex export exposes a busy state and a success status', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Mockup ZIP file').setInputFiles({ name: 'm7-quality.zip', mimeType: 'application/zip', buffer: await createQualityAdapterZip() })
  const frame = page.frameLocator('iframe[title="M7 Quality preview"]')
  await frame.locator('[data-uilab-id="task-bird"]').click()
  await page.getByLabel('W', { exact: true }).fill('206')
  await page.getByLabel('W', { exact: true }).press('Enter')
  const downloadPromise = page.waitForEvent('download')
  const exportButton = page.getByRole('button', { name: 'Export for Codex' })
  await exportButton.click()
  await expect(page.getByRole('button', { name: 'Exporting…' })).toBeDisabled()
  await downloadPromise
  await expect(page.getByText('Codex package exported')).toBeVisible()
  await page.screenshot({ path: 'docs/screenshots/m7/03-status-feedback.png', fullPage: true })
  await expect(exportButton).toBeEnabled()
})

test('Milestone 7 handles shortcuts from iframe focus without stealing native input undo', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Mockup ZIP file').setInputFiles({ name: 'm7-quality.zip', mimeType: 'application/zip', buffer: await createQualityAdapterZip() })
  const frame = page.frameLocator('iframe[title="M7 Quality preview"]')
  const target = frame.locator('[data-uilab-id="task-bird"]')

  await target.click()
  await expect(page.getByTestId('selection-summary')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('selection-summary')).not.toBeVisible()

  await target.click()
  await page.getByLabel('W', { exact: true }).fill('206')
  await page.getByLabel('W', { exact: true }).press('Enter')
  await expect(page.getByTestId('dirty-indicator')).toContainText('1 changes')

  await frame.locator('input[aria-label="Native preview input"]').focus()
  await page.keyboard.press('Control+Z')
  await expect(page.getByTestId('dirty-indicator')).toContainText('1 changes')

  await target.click()
  await page.keyboard.press('Control+Z')
  await expect(page.getByTestId('dirty-indicator')).not.toBeVisible()
})

test('Milestone 7 allows Project Import replacement after Continue', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Mockup ZIP file').setInputFiles({ name: 'm7-quality.zip', mimeType: 'application/zip', buffer: await createQualityAdapterZip() })
  const frame = page.frameLocator('iframe[title="M7 Quality preview"]')
  await frame.locator('[data-uilab-id="task-bird"]').click()
  await page.getByLabel('W', { exact: true }).fill('206')
  await page.getByLabel('W', { exact: true }).press('Enter')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Project' }).click()
  const projectDownload = await downloadPromise
  const projectPath = await projectDownload.path()
  if (!projectPath) throw new Error('Project download was not created')

  await page.getByRole('button', { name: 'Import Project' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('UI Lab project file').setInputFiles({ name: 'm7-quality.ui-project', mimeType: 'application/zip', buffer: await fs.readFile(projectPath) })
  await expect(page.getByText('Project imported')).toBeVisible()
  await expect(page.getByTitle('M7 Quality preview')).toBeVisible()
})
