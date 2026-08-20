import type { EditableProperty } from '../../schemas/adapter'

export type InspectorStyleProperty = Exclude<EditableProperty, 'position' | 'width' | 'height'>

export interface InspectorStyleSnapshot {
  padding: number
  margin: number
  gap: number
  fontSize: number
  fontWeight: number
  lineHeight: number
  color: string
  background: string
  border: string
  borderRadius: number
  opacity: number
}

export type InlineStyleSnapshot = Partial<Record<InspectorStyleProperty, string>>

export const inspectorStyleProperties: InspectorStyleProperty[] = [
  'padding', 'margin', 'gap', 'fontSize', 'fontWeight', 'lineHeight',
  'color', 'background', 'border', 'borderRadius', 'opacity',
]

export const inspectorPropertyValueTypes = {
  position: 'visual',
  width: 'visual',
  height: 'visual',
  padding: 'exact',
  margin: 'exact',
  gap: 'exact',
  fontSize: 'exact',
  fontWeight: 'exact',
  lineHeight: 'exact',
  color: 'exact',
  background: 'exact',
  border: 'exact',
  borderRadius: 'exact',
  opacity: 'exact',
} as const

export function getInspectorPropertyValueType(property: EditableProperty): 'exact' | 'visual' {
  return inspectorPropertyValueTypes[property]
}

export const defaultInspectorStyles: InspectorStyleSnapshot = {
  padding: 0,
  margin: 0,
  gap: 0,
  fontSize: 16,
  fontWeight: 400,
  lineHeight: 19.2,
  color: '#000000',
  background: '#ffffff',
  border: 'none',
  borderRadius: 0,
  opacity: 1,
}

export function cssPropertyName(property: InspectorStyleProperty): string {
  return property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

export function parseCssNumber(value: string | number | undefined, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (!value) return fallback
  const match = value.trim().match(/^-?(?:\d+\.?\d*|\.\d+)(?:px)?$/i)
  if (!match) return fallback
  const parsed = Number.parseFloat(match[0])
  return Number.isFinite(parsed) ? parsed : fallback
}

export function clampOpacity(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function parseInspectorNumber(property: EditableProperty, raw: string): number | undefined {
  const value = Number(raw.trim())
  if (!Number.isFinite(value)) return undefined
  if ((property === 'width' || property === 'height') && value <= 0) return undefined
  if (property === 'fontSize' && value < 1) return undefined
  if ((property === 'lineHeight' || property === 'fontWeight') && value <= 0) return undefined
  if ((property === 'padding' || property === 'margin' || property === 'gap' || property === 'borderRadius') && value < 0) return undefined
  if (property === 'opacity') return clampOpacity(value)
  return value
}

function componentToHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0')
}

export function cssColorToHex(value: string, fallback = '#000000'): string {
  const normalized = value.trim().toLowerCase()
  const shortHex = normalized.match(/^#([\da-f]{3})$/i)
  if (shortHex) return `#${shortHex[1].split('').map((part) => part + part).join('')}`
  const fullHex = normalized.match(/^#([\da-f]{6})$/i)
  if (fullHex) return `#${fullHex[1]}`
  const rgb = normalized.match(/^rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)/i)
  if (rgb) {
    return `#${componentToHex(Number(rgb[1]))}${componentToHex(Number(rgb[2]))}${componentToHex(Number(rgb[3]))}`
  }
  return fallback
}

function readComputedStyle(element: HTMLElement): CSSStyleDeclaration | undefined {
  return element.ownerDocument.defaultView?.getComputedStyle(element)
}

export function readComputedStyleSnapshot(element: HTMLElement): InspectorStyleSnapshot {
  const computed = readComputedStyle(element)
  if (!computed) return { ...defaultInspectorStyles }
  const fontSize = parseCssNumber(computed.fontSize, defaultInspectorStyles.fontSize)
  const lineHeight = computed.lineHeight === 'normal'
    ? fontSize * 1.2
    : parseCssNumber(computed.lineHeight, fontSize * 1.2)
  return {
    padding: parseCssNumber(computed.padding, 0),
    margin: parseCssNumber(computed.margin, 0),
    gap: parseCssNumber(computed.gap, 0),
    fontSize,
    fontWeight: parseCssNumber(computed.fontWeight, 400),
    lineHeight,
    color: cssColorToHex(computed.color, defaultInspectorStyles.color),
    background: cssColorToHex(computed.backgroundColor, defaultInspectorStyles.background),
    border: computed.border || defaultInspectorStyles.border,
    borderRadius: parseCssNumber(computed.borderRadius, 0),
    opacity: clampOpacity(parseCssNumber(computed.opacity, 1)),
  }
}

export function readInlineStyleSnapshot(element: HTMLElement): InlineStyleSnapshot {
  const snapshot: InlineStyleSnapshot = {}
  for (const property of inspectorStyleProperties) {
    const value = element.style.getPropertyValue(cssPropertyName(property))
    if (value) snapshot[property] = value
  }
  return snapshot
}

export function mergeInspectorStyles(
  base: InspectorStyleSnapshot,
  property: InspectorStyleProperty,
  value: unknown,
): InspectorStyleSnapshot {
  if (typeof value !== 'number' && typeof value !== 'string') return { ...base }
  if (property === 'opacity' && typeof value === 'number') return { ...base, opacity: clampOpacity(value) }
  return { ...base, [property]: value } as InspectorStyleSnapshot
}

export function isSafeCssValue(property: InspectorStyleProperty, value: string): boolean {
  if (!value.trim()) return false
  const probe = document.createElement('div').style
  probe.setProperty(cssPropertyName(property), value)
  return Boolean(probe.getPropertyValue(cssPropertyName(property)))
}
