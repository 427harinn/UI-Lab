import { z } from 'zod'
import type { Viewport } from './project'

export const editablePropertySchema = z.enum([
  'position',
  'width',
  'height',
  'padding',
  'margin',
  'gap',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'color',
  'background',
  'border',
  'borderRadius',
  'opacity',
])

export const adapterProjectSchema = z.object({
  formatVersion: z.literal(1),
  name: z.string().min(1),
  entry: z.string().min(1).refine((value) => !value.startsWith('/') && !value.includes('..') && !/^\w+:\/\//.test(value), {
    message: 'entry must be a relative ZIP path',
  }),
  defaultViewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }).strict(),
}).strict()

const adapterScreenDefinitionSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  defaultState: z.string().min(1),
}).strict()

export const adapterScreensSchema = z.record(z.string().min(1), adapterScreenDefinitionSchema).refine(
  (screens) => Object.keys(screens).length > 0,
  { message: 'screens.json must declare at least one screen' },
)

export const adapterComponentSchema = z.object({
  selector: z.string().min(1),
  instances: z.enum(['single', 'multiple']),
  editable: z.array(editablePropertySchema),
}).strict()

export const adapterComponentsSchema = z.record(z.string().min(1), adapterComponentSchema)

export const adapterStateSchema = z.object({
  name: z.string().min(1),
}).strict()

export const adapterStatesSchema = z.record(
  z.string().min(1),
  z.record(z.string().min(1), adapterStateSchema),
)

export const adapterTokensSchema = z.record(z.string(), z.unknown())

export type EditableProperty = z.infer<typeof editablePropertySchema>
export type AdapterProject = z.infer<typeof adapterProjectSchema>
export type AdapterScreenDocument = z.infer<typeof adapterScreensSchema>
export type AdapterComponentDocument = z.infer<typeof adapterComponentsSchema>
export type AdapterStateDocument = z.infer<typeof adapterStatesSchema>
export type AdapterScreen = { id: string } & z.infer<typeof adapterScreenDefinitionSchema>
export type AdapterComponent = { id: string } & z.infer<typeof adapterComponentSchema>
export type AdapterState = { id: string; screenId: string } & z.infer<typeof adapterStateSchema>
export type AdapterTokens = z.infer<typeof adapterTokensSchema>

export interface ImportedMockup {
  name: string
  formatVersion: 1
  entry: string
  defaultViewport: Viewport
  screens: AdapterScreen[]
  components: AdapterComponent[]
  tokens: AdapterTokens
  states: AdapterState[]
  previewHtml: string
}

export function getScreenPath(screen: AdapterScreen): string {
  return screen.path
}

export function getStatesForScreen(states: AdapterState[], screenId: string): AdapterState[] {
  return states.filter((state) => state.screenId === screenId)
}

export function resolveDefaultState(screen: AdapterScreen, states: AdapterState[]): string {
  const declaredDefault = getStatesForScreen(states, screen.id).find((state) => state.id === screen.defaultState)
  return declaredDefault?.id ?? screen.defaultState
}
