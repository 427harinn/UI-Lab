import { expect, test } from '@playwright/test'
import JSZip from 'jszip'
import fs from 'node:fs/promises'
import { loadHouseToDoFixture } from './helpers/adapterFixture'

async function createM10Zip(): Promise<Buffer> {
  const zip = new JSZip()
  zip.file('.uilab/project.json', JSON.stringify({ formatVersion: 1, name: 'M10 synthetic', entry: 'dist/index.html', defaultViewport: { width: 520, height: 760 } }))
  zip.file('.uilab/screens.json', JSON.stringify({ home: { name: 'Home', path: '/home', defaultState: 'normal' } }))
  zip.file('.uilab/components.json', JSON.stringify({
    Outer: { selector: "[data-uilab-component='Outer']", instances: 'single', editable: ['height'] },
    Inner: { selector: "[data-uilab-component='Inner']", instances: 'single', editable: ['height'] },
    Deep: { selector: "[data-uilab-component='Deep']", instances: 'single', editable: ['height'] },
    Card: { selector: "[data-uilab-component='Card']", instances: 'multiple', editable: ['height', 'background'] },
    FlowHeading: { selector: "[data-uilab-component='FlowHeading']", instances: 'multiple', editable: ['position', 'margin', 'height', 'background'] },
    Absolute: { selector: "[data-uilab-component='Absolute']", instances: 'single', editable: ['position', 'width', 'height'] },
  }))
  zip.file('.uilab/tokens.json', JSON.stringify({}))
  zip.file('.uilab/states.json', JSON.stringify({ home: { normal: { name: 'Normal' } } }))
  zip.file('dist/index.html', `<!doctype html><html><head><style>
    *{box-sizing:border-box}body{margin:0;width:520px;height:760px;font:16px Arial;background:#f6f7fb}main{padding:24px;display:block}.nested{padding:16px;background:#dde7ff}.inner{padding:14px;background:#c5d6ff}.deep{height:32px;background:#93b3ff}.cards{display:flex;flex-direction:column;gap:8px;margin-top:18px}.card{height:56px;background:#91c9a4;border-radius:8px}.flow{height:40px;margin-top:14px;background:#f0b35a}.absolute{position:absolute;left:300px;top:300px;width:120px;height:40px;background:#d88080}
  </style></head><body><main>
    <section class="nested" data-uilab-component="Outer" data-uilab-id="outer"><div class="inner" data-uilab-component="Inner" data-uilab-id="inner"><div class="deep" data-uilab-component="Deep" data-uilab-id="deep">Nested target</div></div></section>
    <div class="cards"><div class="card" data-uilab-component="Card" data-uilab-id="card-a">Card A</div><div class="card" data-uilab-component="Card" data-uilab-id="card-b">Card B</div></div>
    <h2 class="flow" data-uilab-component="FlowHeading" data-uilab-id="heading">Tasks</h2><div data-testid="task-list">Task list</div>
    <div class="absolute" data-uilab-component="Absolute" data-uilab-id="absolute">Absolute</div>
  </main></body></html>`)
  return zip.generateAsync({ type: 'nodebuffer' })
}

test('M10 nested selection, component scope, flow spacing, and visual fallback', async ({ page }) => {
  await fs.mkdir('docs/screenshots/m10', { recursive: true })
  await page.goto('/')
  await page.getByLabel('Mockup ZIP file').setInputFiles({ name: 'm10.zip', mimeType: 'application/zip', buffer: await createM10Zip() })
  const frame = page.frameLocator('iframe[title="M10 synthetic preview"]')
  const deep = frame.locator('[data-uilab-id="deep"]')
  await expect(deep).toBeVisible()
  await deep.click()
  await expect(page.getByTestId('selected-instance-id')).toHaveText('outer')
  await deep.click()
  await expect(page.getByTestId('selected-instance-id')).toHaveText('inner')
  await deep.click()
  await expect(page.getByTestId('selected-instance-id')).toHaveText('deep')
  await expect(page.getByTestId('selection-breadcrumb')).toContainText('Outer')
  await page.screenshot({ path: 'docs/screenshots/m10/01-nested-selection.png', fullPage: true })

  const cardA = frame.locator('[data-uilab-id="card-a"]')
  const cardB = frame.locator('[data-uilab-id="card-b"]')
  await cardA.click()
  await page.getByLabel('All instances').check()
  await page.getByLabel('H', { exact: true }).fill('76')
  await page.getByLabel('H', { exact: true }).press('Enter')
  await expect(cardA).toHaveCSS('height', '76px')
  await expect(cardB).toHaveCSS('height', '76px')
  await expect(page.getByTestId('dirty-indicator')).toContainText('1 changes')
  await page.screenshot({ path: 'docs/screenshots/m10/02-component-scope.png', fullPage: true })
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(cardA).toHaveCSS('height', '56px')
  await expect(cardB).toHaveCSS('height', '56px')
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(cardB).toHaveCSS('height', '76px')

  const heading = frame.locator('[data-uilab-id="heading"]')
  const headingBox = await heading.boundingBox()
  if (!headingBox) throw new Error('Flow heading has no bounding box')
  const beforeTask = await frame.getByTestId('task-list').boundingBox()
  await heading.click()
  await expect(page.getByTestId('selected-instance-id')).toHaveText('heading')
  await heading.dispatchEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1, clientX: 30, clientY: 320 })
  await heading.dispatchEvent('pointermove', { bubbles: true, button: 0, pointerId: 1, clientX: 30, clientY: 334 })
  await heading.dispatchEvent('pointerup', { bubbles: true, button: 0, pointerId: 1, clientX: 30, clientY: 334 })
  await expect(page.locator('.preview-panel__editing-status')).toContainText('Spacing')
  const afterTask = await frame.getByTestId('task-list').boundingBox()
  expect(afterTask?.y ?? 0).toBeGreaterThan(beforeTask?.y ?? 0)
  await page.screenshot({ path: 'docs/screenshots/m10/03-flow-aware-spacing.png', fullPage: true })

  const absolute = frame.locator('[data-uilab-id="absolute"]')
  await absolute.click()
  const beforeAbsolute = await absolute.boundingBox()
  if (!beforeAbsolute) throw new Error('Absolute target has no bounding box')
  await page.mouse.move(beforeAbsolute.x + 20, beforeAbsolute.y + 20)
  await page.mouse.down()
  await page.mouse.move(beforeAbsolute.x + 40, beforeAbsolute.y + 20)
  await page.mouse.up()
  await expect(page.getByTestId('dirty-indicator')).toContainText('3 changes')
  await page.screenshot({ path: 'docs/screenshots/m10/05-visual-fallback.png', fullPage: true })
})

test('M10 HouseToDo Calendar.DayCell component scope uses real Adapter metadata', async ({ page }) => {
  const fixture = await loadHouseToDoFixture()
  const dayCell = fixture.components.find((component) => component.id === 'Calendar.DayCell')
  expect(dayCell?.instances).toBe('multiple')
  expect(dayCell?.editable).toContain('height')
  await page.goto('/')
  await page.getByLabel('Mockup ZIP file').setInputFiles(fixture.zipPath)
  const frame = page.frameLocator('iframe.preview-frame')
  const cells = frame.locator("[data-uilab-component='Calendar.DayCell']")
  await page.locator('section[aria-labelledby="screens-heading"] button.navigator-item').filter({ hasText: '/calendar' }).click()
  await expect(cells.first()).toBeVisible()
  await cells.first().click()
  await cells.first().click()
  await cells.first().click()
  await expect(page.getByTestId('selected-instance-id')).not.toHaveText('calendar-page')
  await page.getByLabel('All instances').check()
  const before = await cells.evaluateAll((elements) => elements.map((element) => Number.parseFloat(element.ownerDocument.defaultView?.getComputedStyle(element).height ?? '0')))
  const nextHeight = Math.max(...before) + 12
  await page.getByLabel('H', { exact: true }).fill(String(nextHeight))
  await page.getByLabel('H', { exact: true }).press('Enter')
  await expect.poll(async () => cells.evaluateAll((elements, height) => elements.every((element) => element.ownerDocument.defaultView?.getComputedStyle(element).height === `${height}px`), nextHeight)).toBe(true)
  await page.screenshot({ path: 'docs/screenshots/m10/04-house-todo-calendar.png', fullPage: true })
})
