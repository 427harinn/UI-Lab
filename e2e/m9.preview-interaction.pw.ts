import { expect, test } from '@playwright/test'
import JSZip from 'jszip'
import fs from 'node:fs/promises'

async function createM9Zip(kind: 'async' | 'conditional' | 'hash-async'): Promise<Buffer> {
  const zip = new JSZip()
  const isHashAsync = kind === 'hash-async'
  zip.file('.uilab/project.json', JSON.stringify({ formatVersion: 1, name: `M9 ${kind}`, entry: 'dist/index.html', defaultViewport: { width: 390, height: 844 } }))
  zip.file('.uilab/screens.json', JSON.stringify(isHashAsync
    ? { home: { name: 'Home', path: '/home', defaultState: 'normal' }, next: { name: 'Next', path: '/next', defaultState: 'normal' } }
    : { home: { name: 'Home', path: '/home', defaultState: 'normal' } }))
  zip.file('.uilab/components.json', JSON.stringify({
    'Home.Action': { selector: "[data-uilab-component='Home.Action']", instances: 'multiple', editable: ['position', 'width', 'height', 'background', 'fontSize'] },
  }))
  zip.file('.uilab/tokens.json', JSON.stringify({ color: { accent: '#5874d8' } }))
  zip.file('.uilab/states.json', JSON.stringify(isHashAsync
    ? { home: { normal: { name: 'Normal' } }, next: { normal: { name: 'Normal' } } }
    : { home: { normal: { name: 'Normal' } } }))
  const mutation = kind === 'async'
    ? `setTimeout(() => { const button = document.createElement('button'); button.dataset.uilabComponent = 'Home.Action'; button.dataset.uilabId = 'async-action'; button.textContent = 'Async action'; button.onclick = () => { button.textContent = 'Native fired'; }; document.querySelector('main').append(button); }, 50);`
    : kind === 'conditional'
      ? `setTimeout(() => { document.querySelector('[data-uilab-id="target-a"]')?.remove(); const button = document.createElement('button'); button.dataset.uilabComponent = 'Home.Action'; button.dataset.uilabId = 'target-b'; button.textContent = 'Target B'; document.querySelector('main').append(button); }, 1500);`
      : `const renderRoute = () => { if (location.hash.startsWith('#/next')) { setTimeout(() => { if (document.querySelector('[data-uilab-id="next-action"]')) return; const button = document.createElement('button'); button.dataset.uilabComponent = 'Home.Action'; button.dataset.uilabId = 'next-action'; button.textContent = 'Next async action'; document.querySelector('main').append(button); const add = document.createElement('button'); add.id = 'add-sibling'; add.textContent = 'Add sibling'; add.onclick = () => { const sibling = document.createElement('span'); sibling.textContent = 'native DOM commit'; document.querySelector('main').append(sibling); }; document.querySelector('main').append(add); }, 60); } else { document.querySelector('[data-uilab-id="next-action"]')?.remove(); document.querySelector('#add-sibling')?.remove(); } }; window.addEventListener('hashchange', renderRoute); renderRoute();`
  const initial = kind === 'async'
    ? '<p>Waiting for async commit…</p>'
    : kind === 'conditional'
      ? '<button data-uilab-component="Home.Action" data-uilab-id="target-a">Target A</button>'
      : '<a href="#/next">Go next</a><p>Home screen</p>'
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

test('M9 follows native hash navigation, discovers async next-screen targets, and reapplies latest project changes', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Mockup ZIP file').setInputFiles({ name: 'm9-hash-async.zip', mimeType: 'application/zip', buffer: await createM9Zip('hash-async') })
  const frame = page.frameLocator('iframe[title="M9 hash-async preview"]')

  await page.getByRole('button', { name: 'Interact', exact: true }).click()
  await frame.getByRole('link', { name: 'Go next' }).click()
  await expect.poll(async () => page.locator('iframe.preview-frame').evaluate((element) => element.contentWindow?.location.hash ?? '')).toContain('#/next')

  const nextTarget = frame.locator('[data-uilab-id="next-action"]')
  await expect(nextTarget).toBeVisible()
  await page.getByRole('button', { name: 'Select', exact: true }).click()
  await nextTarget.click()
  await expect(page.getByTestId('selected-instance-id')).toHaveText('next-action')
  await page.getByLabel('W', { exact: true }).fill('196')
  await page.getByLabel('W', { exact: true }).press('Enter')
  await expect(nextTarget).toHaveCSS('width', '196px')

  await page.getByRole('button', { name: 'Interact', exact: true }).click()
  await frame.locator('#add-sibling').click()
  await expect(frame.getByText('native DOM commit')).toBeVisible()
  await expect(nextTarget).toHaveCSS('width', '196px')
})
