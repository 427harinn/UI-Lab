import { describe, expect, it } from 'vitest'
import { adapterComponentSchema, adapterProjectSchema, adapterScreensSchema, adapterStatesSchema, resolveDefaultState } from './adapter'

const project = {
  formatVersion: 1,
  name: 'Synthetic mockup',
  entry: 'dist/index.html',
  defaultViewport: { width: 390, height: 844 },
}

const screen = { id: 'home', name: 'Home', path: '/home', defaultState: 'normal' }

describe('Adapter v1 schemas', () => {
  it('accepts the minimal adapter documents', () => {
    expect(adapterProjectSchema.safeParse(project).success).toBe(true)
    expect(adapterScreensSchema.safeParse({ screens: [screen] }).success).toBe(true)
    expect(adapterComponentSchema.safeParse({
      id: 'card', name: 'Card', type: 'Card', instances: 'multiple', editableProperties: ['width', 'color'],
    }).success).toBe(true)
    expect(adapterStatesSchema.safeParse({ states: [{ id: 'normal', name: 'Normal', screenId: 'home' }] }).success).toBe(true)
  })

  it('rejects unsupported format versions and editable properties', () => {
    expect(adapterProjectSchema.safeParse({ ...project, formatVersion: 2 }).success).toBe(false)
    expect(adapterComponentSchema.safeParse({
      id: 'card', name: 'Card', type: 'Card', instances: 'single', editableProperties: ['transform'],
    }).success).toBe(false)
  })

  it('resolves a screen default state even when the adapter does not declare a matching state', () => {
    expect(resolveDefaultState(screen, [])).toBe('normal')
  })
})
