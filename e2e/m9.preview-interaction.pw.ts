import { expect, test } from '@playwright/test'
import JSZip from 'jszip'
import fs from 'node:fs/promises'

async function createM9Zip(kind: 'async' | 'conditional'): Promise<Buffer> {
  const zip = new JSZip()
  zip.file('.uilab/project.json', JSON.stringify({ formatVersion: 1, name: `M9 ${kind}`, entry: 'dist/index.html', defaultViewport: { width: 390, height: 844 } }))
  zip.file('.uilab/screens.json', JSON.stringify({ home: { name: 'Home', path: '/home', defaultState: 'normal' } }))
  zip.file('.uilab/components.json', JSON.stringify({
    'Home.Action': { selector: "[data-uilab-component='Home.Action']", instances: 'multiple', editable: ['position', 'width', 'height', 'background', 'fontSize'] },
  }))
  zip.file('.uilab/tokens.json', JSON.stringify({ color: { accent: '#5874d8' } }))
  zip.file('.uilab/states.json', JSON.stringify({ home: { normal: { name: 'Normal' } } }))
  const mutation = kind === 'async'
    ? `setTimeout(() => { const button = document.createElement('button'); button.dataset.uilabComponent = 'Home.Action'; button.dataset.uilabId = 'async-action'; button.textContent = 'Async action'; button.onclick = () => { button.textContent = 'Native fired'; }; document.querySelector('main').append(button); }, 50);`
    : `setTimeout(() => { document.querySelector('[data-uilab-id="target-a"]')?.remove(); const button = document.createElement('button'); button.dataset.uilabComponent = 'Home.Action'; button.dataset.uilabId = 'target-b'; button.textContent = 'Target B'; document.querySelector('main').append(button); }, 500);`
  const initial = kind === 'async'
    ? '<p>Waiting for async commit…</p>'
    : '<button data-uilab-component="Home.Action" data-uilab-id="target-a">Target A</button>'
  zip.file('dist/index.html', `<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;width:390px;height:844px;font-family:Arial}main{padding:32px;display:grid;gap:12px}button{width:180px;height:56px;background:#5874d8;color:#fff;border:0;border-radius:10px}</style></head><body><main>${initial}</main><script>${mutation}</script></body></html>`)
  return zip.generateAsync({ type: 'nodebuffer' })
}

test('M9 discovers async targets and supports Select versus Interact', async ({ page }) => {
  await fs.mkdir('docs/screenshots/m9', { recursive: true })
  await page.goto('/')
  await page.getByLabel('Mockup ZIP file').setInputFiles({ name: 'm9-async.zip', mimeType: 'application/zip', buffer: await createM9Zip('async') })
  const frame = page.frameLocator('iframe[title="M9 async preview"]')
  const target = frame.locator('[data-uilab-id="async-action"]')
  await expect(target).toBeVisible()
  await target.click()
  await expect(page.getByTestId('selected-instance-id')).toHaveText('async-action')
  await expect(target).toHaveText('Async action')
  await page.screenshot({ path: 'docs/screenshots/m9/01-select-mode.png', fullPage: true })

  await page.getByRole('button', { name: 'Interact', exact: true }).click()
  await target.click()
  await expect(page.getByTestId('selected-instance-id')).toHaveText('async-action')
  await expect(target).toHaveText('Native fired')
  await page.screenshot({ path: 'docs/screenshots/m9/02-interact-mode.png', fullPage: true })

  await page.keyboard.press('Escape')
  await expect(page.getByTestId('selection-summary')).toHaveCount(0)
  await page.getByRole('button', { name: 'Select', exact: true }).click()
  await target.click()
  await expect(page.getByTestId('selected-instance-id')).toHaveText('async-action')
  await page.getByLabel('W', { exact: true }).fill('196')
  await page.getByLabel('W', { exact: true }).press('Enter')
  await expect(page.getByTestId('dirty-indicator')).toContainText('1 changes')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByTestId('dirty-indicator')).not.toBeVisible()
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(page.getByTestId('dirty-indicator')).toContainText('1 changes')
  await page.screenshot({ path: 'docs/screenshots/m9/03-rediscovered-target.png', fullPage: true })
})

test('M9 reconciles selected identities when conditional DOM changes', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Mockup ZIP file').setInputFiles({ name: 'm9-conditional.zip', mimeType: 'application/zip', buffer: await createM9Zip('conditional') })
  const frame = page.frameLocator('iframe[title="M9 conditional preview"]')
  const targetA = frame.locator('[data-uilab-id="target-a"]')
  await targetA.click()
  await expect(page.getByTestId('selected-instance-id')).toHaveText('target-a')
  await expect(frame.locator('[data-uilab-id="target-b"]')).toBeVisible()
  await expect(targetA).toHaveCount(0)
  await expect(page.getByTestId('selection-summary')).toHaveCount(0)
  await frame.locator('[data-uilab-id="target-b"]').click()
  await expect(page.getByTestId('selected-instance-id')).toHaveText('target-b')
})
