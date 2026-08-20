import { expect, test } from '@playwright/test'
import JSZip from 'jszip'
import fs from 'node:fs/promises'

async function createInspectorAdapterZip(): Promise<Buffer> {
  const zip = new JSZip()
  zip.file('.uilab/project.json', JSON.stringify({ formatVersion: 1, name: 'M4 Inspector Synthetic', entry: 'dist/index.html', defaultViewport: { width: 430, height: 700 } }))
  zip.file('.uilab/screens.json', JSON.stringify({ home: { name: 'Home', path: '/home', defaultState: 'normal' }, alternate: { name: 'Alternate', path: '/alternate', defaultState: 'normal' } }))
  zip.file('.uilab/components.json', JSON.stringify({
    'Home.TaskRow': { selector: "[data-uilab-component='Home.TaskRow']", instances: 'multiple', editable: ['position', 'width', 'height', 'padding', 'margin', 'gap', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'background', 'border', 'borderRadius', 'opacity'] },
    'Home.LockedRow': { selector: "[data-uilab-component='Home.LockedRow']", instances: 'single', editable: ['width', 'background'] },
  }))
  zip.file('.uilab/tokens.json', JSON.stringify({ color: { accent: '#6f8cff' } }))
  zip.file('.uilab/states.json', JSON.stringify({ home: { normal: { name: 'Normal' } }, alternate: { normal: { name: 'Normal' } } }))
  zip.file('dist/index.html', `<!doctype html><html><head><style>
    *,*:before,*:after{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;font-family:system-ui;background:#f7f9fc}
    .canvas{position:relative;width:100%;height:100%;background:linear-gradient(135deg,#f7f9fc,#e9effa)}
    [data-uilab-component]{position:absolute;display:grid;place-items:center;border-radius:12px;color:#fff;background:#5874d8;box-shadow:0 8px 20px rgba(40,60,110,.2);user-select:none}
  </style></head><body><main class="canvas">
    <div data-uilab-component="Home.TaskRow" data-uilab-id="task-bird" style="left:54px;top:132px;width:164px;height:72px;padding:12px;font-size:16px;font-weight:600;line-height:24px;color:#303531;background:#5874d8;border:1px solid #e5e7e2;border-radius:12px;opacity:1">Task Bird</div>
    <div data-uilab-component="Home.LockedRow" data-uilab-id="locked-row" style="left:54px;top:300px;width:164px;height:64px;background:#8b64c7">Locked Position</div>
  </main></body></html>`)
  return zip.generateAsync({ type: 'nodebuffer' })
}

async function commitInput(page: import('@playwright/test').Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true })
  await input.fill(value)
  await input.press('Enter')
}

test('Milestone 4 Inspector edit, history, gating, and screenshots', async ({ page }) => {
  await fs.mkdir('docs/screenshots/m4', { recursive: true })
  await page.goto('/')
  await page.getByLabel('Mockup ZIP file').setInputFiles({ name: 'm4-synthetic.zip', mimeType: 'application/zip', buffer: await createInspectorAdapterZip() })

  const frame = page.frameLocator('iframe[title="M4 Inspector Synthetic preview"]')
  const bird = frame.locator('[data-uilab-id="task-bird"]')
  await expect(bird).toBeVisible()
  await bird.click()
  await expect(page.getByText('Component ID')).toBeVisible()
  await expect(page.getByLabel('Font Size')).toBeVisible()
  await expect(page.getByLabel('Background', { exact: true })).toHaveValue('#5874d8')
  await page.screenshot({ path: 'docs/screenshots/m4/01-inspector-overview.png', fullPage: true })

  await commitInput(page, 'Font Size', '20')
  await commitInput(page, 'Background', '#ffedd5')
  await commitInput(page, 'Radius', '20')
  await commitInput(page, 'Font Weight', '700')
  await expect(bird).toHaveCSS('background-color', 'rgb(255, 237, 213)')
  await expect(bird).toHaveCSS('font-size', '20px')
  await expect(bird).toHaveCSS('border-radius', '20px')
  await expect(bird).toHaveCSS('font-weight', '700')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByTestId('selection-summary')).not.toBeVisible()
  await bird.click()
  await expect(bird).toHaveCSS('font-weight', '600')
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(page.getByTestId('selection-summary')).not.toBeVisible()
  await bird.click()
  await expect(bird).toHaveCSS('font-weight', '700')
  await page.screenshot({ path: 'docs/screenshots/m4/02-appearance-edited.png', fullPage: true })

  await commitInput(page, 'X', '104')
  await commitInput(page, 'Y', '182')
  await commitInput(page, 'W', '206')
  await commitInput(page, 'H', '92')
  await expect(page.getByTestId('measurement-x')).toHaveText('104')
  await expect(page.getByTestId('measurement-y')).toHaveText('182')
  await expect(page.getByTestId('measurement-width')).toHaveText('206')
  await expect(page.getByTestId('measurement-height')).toHaveText('92')
  await page.screenshot({ path: 'docs/screenshots/m4/03-geometry-edited.png', fullPage: true })

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByTestId('selection-summary')).not.toBeVisible()
  await bird.click()
  await expect(page.getByTestId('measurement-height')).toHaveText('72')
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(page.getByTestId('selection-summary')).not.toBeVisible()
  await bird.click()
  await expect(page.getByTestId('measurement-height')).toHaveText('92')

  const locked = frame.locator('[data-uilab-id="locked-row"]')
  await locked.click()
  await expect(page.getByLabel('W', { exact: true })).toBeEnabled()
  await expect(page.getByLabel('Background', { exact: true })).toBeEnabled()
  await expect(page.getByLabel('X', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Font Size', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: /^Alternate/ }).click()
  await expect(page.getByTestId('selection-summary')).not.toBeVisible()
})
