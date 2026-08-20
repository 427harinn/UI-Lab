import { expect, test } from '@playwright/test'
import JSZip from 'jszip'
import * as fs from 'node:fs/promises'

async function createAdapterZip(): Promise<Buffer> {
  const zip = new JSZip()
  zip.file('.uilab/project.json', JSON.stringify({
    formatVersion: 1, name: 'HouseToDo', entry: 'dist/index.html', defaultViewport: { width: 390, height: 844 },
  }))
  zip.file('.uilab/screens.json', JSON.stringify({ home: { name: 'Home', path: '/home', defaultState: 'normal' } }))
  zip.file('.uilab/components.json', JSON.stringify({
    'Home.TaskRow': { selector: "[data-uilab-component='Home.TaskRow']", instances: 'multiple', editable: ['position', 'width', 'height', 'background', 'fontSize'] },
  }))
  zip.file('.uilab/tokens.json', JSON.stringify({ color: { background: '#FCFBF7', primary: '#8FD3B6' }, spacing: { md: 12 } }))
  zip.file('.uilab/states.json', JSON.stringify({ home: { normal: { name: 'Normal' }, overdue: { name: 'Overdue' } } }))
  zip.file('dist/index.html', `<!doctype html><html><head><style>
    * { box-sizing: border-box; } body { margin: 0; width: 390px; height: 844px; background: #FCFBF7; font-family: Arial, sans-serif; }
    main { padding: 44px 24px; } [data-uilab-component] { position: absolute; left: 54px; top: 132px; width: 164px; height: 72px; display: grid; place-items: center; border-radius: 12px; color: white; background: #5874d8; font-size: 16px; }
  </style></head><body><main><div data-uilab-component="Home.TaskRow" data-uilab-id="task-bird">Task Bird</div></main></body></html>`)
  return zip.generateAsync({ type: 'nodebuffer' })
}

async function createMultiScreenAdapterZip(): Promise<Buffer> {
  const zip = new JSZip()
  zip.file('.uilab/project.json', JSON.stringify({
    formatVersion: 1, name: 'MultiScreen', entry: 'dist/index.html', defaultViewport: { width: 390, height: 844 },
  }))
  zip.file('.uilab/screens.json', JSON.stringify({
    home: { name: 'Home', path: '/home', defaultState: 'normal' },
    shopping: { name: 'Shopping', path: '/shopping', defaultState: 'normal' },
  }))
  zip.file('.uilab/components.json', JSON.stringify({
    'Home.TaskRow': { selector: "[data-uilab-component='Home.TaskRow']", instances: 'single', editable: ['background'] },
    'Shopping.TaskRow': { selector: "[data-uilab-component='Shopping.TaskRow']", instances: 'single', editable: ['background'] },
  }))
  zip.file('.uilab/tokens.json', JSON.stringify({ color: { home: '#FCFBF7', shopping: '#EFFCF5' } }))
  zip.file('.uilab/states.json', JSON.stringify({ home: { normal: { name: 'Normal' } }, shopping: { normal: { name: 'Normal' } } }))
  zip.file('dist/index.html', `<!doctype html><html><head><style>
    * { box-sizing: border-box; } body { margin: 0; width: 390px; height: 844px; font-family: Arial, sans-serif; }
    [data-uilab-component] { position: absolute; left: 40px; top: 120px; width: 220px; height: 80px; display: grid; place-items: center; border-radius: 12px; color: #163020; font-size: 18px; }
    [data-uilab-component='Home.TaskRow'] { background: #FCFBF7; } [data-uilab-component='Shopping.TaskRow'] { background: #EFFCF5; }
  </style></head><body><main id="app"></main><script>
    function render() {
      const path = location.hash.split('?')[0];
      document.body.style.background = path.includes('/shopping') ? '#DFF7E8' : '#F3F0E8';
      document.querySelector('#app').innerHTML = path.includes('/shopping')
        ? '<div data-uilab-component="Shopping.TaskRow" data-uilab-id="shopping-task">Shopping screen</div>'
        : '<div data-uilab-component="Home.TaskRow" data-uilab-id="home-task">Home screen</div>';
    }
    render();
    addEventListener('hashchange', () => location.reload());
  </script></body></html>`)
  return zip.generateAsync({ type: 'nodebuffer' })
}

async function commitInput(page: import('@playwright/test').Page, label: string, value: string) {
  const input = page.getByLabel(label, { exact: true })
  await input.fill(value)
  await input.press('Enter')
}

test('Milestone 6 creates and validates a Codex Export ZIP', async ({ page }) => {
  await fs.mkdir('docs/screenshots/m6', { recursive: true })
  await page.goto('/')
  await page.getByLabel('Mockup ZIP file').setInputFiles({ name: 'house-todo.zip', mimeType: 'application/zip', buffer: await createAdapterZip() })
  await expect(page.getByRole('button', { name: 'Export for Codex' })).toBeVisible()
  await page.screenshot({ path: 'docs/screenshots/m6/01-export-for-codex.png', fullPage: true })

  const frame = page.frameLocator('iframe[title="HouseToDo preview"]')
  const bird = frame.locator('[data-uilab-id="task-bird"]')
  await expect(bird).toBeVisible()
  await bird.click()
  await commitInput(page, 'W', '206')
  await commitInput(page, 'Background', '#ffedd5')
  await commitInput(page, 'Font Size', '20')
  await expect(bird).toHaveCSS('background-color', 'rgb(255, 237, 213)')
  await expect(bird).toHaveCSS('font-size', '20px')
  await page.screenshot({ path: 'docs/screenshots/m6/02-edited-project.png', fullPage: true })

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export for Codex' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('HouseToDo-ui-changes.zip')
  const path = await download.path()
  expect(path).not.toBeNull()
  const archive = await JSZip.loadAsync(await fs.readFile(path as string))
  for (const required of ['ui-changes.json', 'design-tokens.json', 'screens.json', 'IMPLEMENTATION.md', 'DESIGN.md']) {
    expect(archive.file(required)).not.toBeNull()
  }
  const changes = JSON.parse(await archive.file('ui-changes.json')!.async('string')) as { changes: Array<Record<string, unknown>> }
  expect(changes.changes).toEqual(expect.arrayContaining([
    expect.objectContaining({ screenId: 'home', stateId: 'normal', componentId: 'Home.TaskRow', instanceId: 'task-bird', property: 'width', after: 206, valueType: 'visual' }),
    expect.objectContaining({ property: 'background', after: '#ffedd5', valueType: 'exact' }),
    expect.objectContaining({ property: 'fontSize', after: 20, valueType: 'exact' }),
  ]))
  expect(await archive.file('IMPLEMENTATION.md')!.async('string')).toContain('existing application architecture')
  expect(archive.file('screenshots/home-normal.png')).not.toBeNull()
  expect((await archive.file('screenshots/home-normal.png')!.async('uint8array')).slice(0, 8)).toEqual(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  await page.screenshot({ path: 'docs/screenshots/m6/03-export-ready.png', fullPage: true })
})

test('Milestone 6 waits for the screen route when screen state IDs are identical', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Mockup ZIP file').setInputFiles({ name: 'multi-screen.zip', mimeType: 'application/zip', buffer: await createMultiScreenAdapterZip() })

  const frame = page.frameLocator('iframe[title="MultiScreen preview"]')
  await expect(frame.locator('[data-uilab-id="home-task"]')).toBeVisible()
  await frame.locator('[data-uilab-id="home-task"]').click()
  await page.getByLabel('Background', { exact: true }).fill('#fff1cc')
  await page.getByLabel('Background', { exact: true }).press('Enter')

  await page.getByRole('button', { name: /^Shopping/ }).click()
  await expect(frame.locator('[data-uilab-id="shopping-task"]')).toBeVisible()
  await frame.locator('[data-uilab-id="shopping-task"]').click()
  await page.getByLabel('Background', { exact: true }).fill('#d9f7e8')
  await page.getByLabel('Background', { exact: true }).press('Enter')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export for Codex' }).click()
  const download = await downloadPromise
  const path = await download.path()
  const archive = await JSZip.loadAsync(await fs.readFile(path as string))
  const homeScreenshot = await archive.file('screenshots/home-normal.png')!.async('uint8array')
  const shoppingScreenshot = await archive.file('screenshots/shopping-normal.png')!.async('uint8array')
  expect(Buffer.from(homeScreenshot).equals(Buffer.from(shoppingScreenshot))).toBe(false)
})
