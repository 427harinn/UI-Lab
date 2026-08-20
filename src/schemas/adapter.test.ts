import { describe, expect, it } from 'vitest'
import { adapterComponentSchema, adapterProjectSchema, adapterScreensSchema, adapterStatesSchema, resolveDefaultState } from './adapter'

const project = {
  formatVersion: 1,
  name: 'Synthetic mockup',
  entry: 'dist/index.html',
  defaultViewport: { width: 390, height: 844 },
}

const screen = { name: 'Home', path: '/home', defaultState: 'normal' }

describe('Adapter v1 schemas', () => {
  it('accepts the minimal adapter documents', () => {
    expect(adapterProjectSchema.safeParse(project).success).toBe(true)
    expect(adapterScreensSchema.safeParse({ home: screen }).success).toBe(true)
    expect(adapterComponentSchema.safeParse({
      selector: "[data-uilab-component='Card']", instances: 'multiple', editable: ['width', 'color'],
    }).success).toBe(true)
    expect(adapterStatesSchema.safeParse({ home: { normal: { name: 'Normal' } } }).success).toBe(true)
  })

  it('rejects unsupported format versions and editable properties', () => {
    expect(adapterProjectSchema.safeParse({ ...project, formatVersion: 2 }).success).toBe(false)
    expect(adapterComponentSchema.safeParse({
      selector: "[data-uilab-component='Card']", instances: 'single', editable: ['transform'],
    }).success).toBe(false)
  })

  it('resolves a screen default state even when the adapter does not declare a matching state', () => {
    expect(resolveDefaultState({ id: 'home', ...screen }, [])).toBe('normal')
  })
})
