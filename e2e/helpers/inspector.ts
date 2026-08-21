import type { Page } from '@playwright/test'

export async function readInspectorValue(page: Page, label: string): Promise<string> {
  return page.getByLabel(label, { exact: true }).inputValue()
}

export async function commitInspectorValue(page: Page, label: string, value: string | number): Promise<void> {
  const input = page.getByLabel(label, { exact: true })
  await input.fill(String(value))
  await input.press('Enter')
}

export function rgbFromHex(hex: string): string {
  const normalized = hex.replace('#', '')
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgb(${red}, ${green}, ${blue})`
}
