import { expect, test } from '@playwright/test'
import JSZip from 'jszip'
import fs from 'node:fs/promises'

async function createSyntheticAdapterZip(): Promise<Buffer> {
  const zip = new JSZip()
  zip.file('.uilab/project.json', JSON.stringify({
    formatVersion: 1,
    name: 'M3 Synthetic Adapter',
    entry: 'dist/index.html',
    defaultViewport: { width: 430, height: 700 },
  }))
  zip.file('.uilab/screens.json', JSON.stringify({
    home: { name: 'Home', path: '/home', defaultState: 'normal' },
    alternate: { name: 'Alternate', path: '/alternate', defaultState: 'normal' },
  }))
  zip.file('.uilab/components.json', JSON.stringify({
    'Home.TaskRow': {
      selector: "[data-uilab-component='Home.TaskRow']",
      instances: 'multiple',
      editable: ['position', 'width', 'height'],
    },
  }))
  zip.file('.uilab/tokens.json', JSON.stringify({ color: { accent: '#6f8cff' } }))
  zip.file('.uilab/states.json', JSON.stringify({
    home: { normal: { name: 'Normal' }, overdue: { name: 'Overdue' } },
    alternate: { normal: { name: 'Normal' } },
  }))
  zip.file('dist/index.html', `<!doctype html>
    <html><head><style>
      html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; font-family: system-ui; background: #f7f9fc; }
      .canvas { position: relative; width: 100%; height: 100%; background: linear-gradient(135deg, #f7f9fc 0%, #e9effa 100%); }
      .title { position: absolute; left: 24px; top: 24px; color: #27344d; font-weight: 700; }
      [data-uilab-component='Home.TaskRow'] { position: absolute; display: grid; place-items: center; border-radius: 12px; color: white; background: #5874d8; box-shadow: 0 8px 20px rgba(40, 60, 110, .2); user-select: none; }
    </style></head><body><main class="canvas">
      <div class="title">Synthetic Visual Editing</div>
      <div data-uilab-component="Home.TaskRow" data-uilab-id="task-bird" style="left: 54px; top: 132px; width: 164px; height: 72px;">Task Bird</div>
      <div data-uilab-component="Home.TaskRow" data-uilab-id="task-cat" style="left: 250px; top: 300px; width: 120px; height: 72px; background: #e68c58;">Task Cat</div>
    </main></body></html>`)
  return zip.generateAsync({ type: 'nodebuffer' })
}

test('Milestone 3 visual editing flow', async ({ page }) => {
  await fs.mkdir('docs/screenshots/m3', { recursive: true })
  await page.goto('/')
  await page.getByLabel('Mockup ZIP file').setInputFiles({
    name: 'm3-synthetic.zip',
    mimeType: 'application/zip',
    buffer: await createSyntheticAdapterZip(),
  })

  const frame = page.frameLocator('iframe[title="M3 Synthetic Adapter preview"]')
  const bird = frame.locator('[data-uilab-id="task-bird"]')
  await expect(bird).toBeVisible()
  await bird.click()
  await expect(page.getByTestId('selection-summary')).toContainText('Home.TaskRow')
  await expect(page.getByTestId('selected-instance-id')).toHaveText('task-bird')
  await expect(frame.locator('.moveable-control-box')).toBeVisible()
  await expect(page.getByText('Guides enabled')).toBeVisible()
  await page.screenshot({ path: 'docs/screenshots/m3/01-selected.png', fullPage: true })

  const birdBox = await bird.boundingBox()
  if (!birdBox) throw new Error('Synthetic target has no bounding box')
  await page.mouse.move(birdBox.x + 80, birdBox.y + 35)
  await page.mouse.down()
  await page.mouse.move(birdBox.x + 130, birdBox.y + 85, { steps: 8 })
  await page.mouse.up()
  await expect(page.getByTestId('measurement-x')).toHaveText('104')
  const eastHandle = frame.locator('.uilab-manual-resize-handle--e').first()
  await expect(eastHandle).toBeVisible()
  const eastBox = await eastHandle.boundingBox()
  if (!eastBox) throw new Error('Moveable east handle has no bounding box')
  await eastHandle.hover()
  await eastHandle.dispatchEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1, clientX: 7, clientY: 7 })
  await eastHandle.dispatchEvent('pointermove', { bubbles: true, button: 0, pointerId: 1, clientX: 49, clientY: 7 })
  await eastHandle.dispatchEvent('pointerup', { bubbles: true, button: 0, pointerId: 1, clientX: 49, clientY: 7 })
  await expect(page.getByTestId('measurement-width')).not.toHaveText('164')
  await expect(page.getByTestId('measurement-x')).toHaveText('104')
  await expect(page.getByTestId('selection-summary')).toContainText('X')
  await page.screenshot({ path: 'docs/screenshots/m3/02-moved-resized.png', fullPage: true })

  const movedBirdBox = await bird.boundingBox()
  const iframeBox = await page.locator('iframe[title="M3 Synthetic Adapter preview"]').boundingBox()
  if (!movedBirdBox || !iframeBox) throw new Error('Synthetic target or iframe has no bounding box')
  await page.mouse.move(movedBirdBox.x + movedBirdBox.width / 2, movedBirdBox.y + movedBirdBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(iframeBox.x + movedBirdBox.width / 2, movedBirdBox.y + movedBirdBox.height / 2, { steps: 8 })
  await expect(page.getByText('Snap active')).toBeVisible()
  await expect(frame.locator('[data-testid="snap-vertical-guide"]')).toBeVisible()
  await page.screenshot({ path: 'docs/screenshots/m3/03-snap-guides.png', fullPage: true })
  await page.mouse.up()

  await page.getByRole('button', { name: 'Undo' }).click()
  await page.getByRole('button', { name: 'Redo' }).click()
  await page.getByRole('button', { name: /^Alternate/ }).click()
  await expect(page.getByTestId('selection-summary')).not.toBeVisible()
  await page.getByRole('button', { name: /^Home/ }).click()
  await expect(page.getByTestId('selection-summary')).not.toBeVisible()
})
