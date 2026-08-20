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

const adapterScreenInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1).optional(),
  route: z.string().min(1).optional(),
  defaultState: z.string().min(1),
}).strict().refine((screen) => Boolean(screen.path ?? screen.route), {
  message: 'screen must define path or route',
  path: ['path'],
})

export const adapterScreensSchema = z.object({
  screens: z.array(adapterScreenInputSchema).min(1),
}).strict()

export const adapterComponentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  instances: z.enum(['single', 'multiple']),
  editableProperties: z.array(editablePropertySchema),
}).strict()

export const adapterComponentsSchema = z.object({
  components: z.array(adapterComponentSchema),
}).strict()

export const adapterStateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  screenId: z.string().min(1),
}).strict()

export const adapterStatesSchema = z.object({
  states: z.array(adapterStateSchema),
}).strict()

export const adapterTokensSchema = z.object({
  tokens: z.record(z.string(), z.unknown()),
}).strict()

export type EditableProperty = z.infer<typeof editablePropertySchema>
export type AdapterProject = z.infer<typeof adapterProjectSchema>
export type AdapterScreen = z.infer<typeof adapterScreenInputSchema>
export type AdapterComponent = z.infer<typeof adapterComponentSchema>
export type AdapterState = z.infer<typeof adapterStateSchema>
export type AdapterTokens = z.infer<typeof adapterTokensSchema>['tokens']

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
  return screen.path ?? screen.route ?? '/'
}

export function getStatesForScreen(states: AdapterState[], screenId: string): AdapterState[] {
  return states.filter((state) => state.screenId === screenId)
}

export function resolveDefaultState(screen: AdapterScreen, states: AdapterState[]): string {
  const declaredDefault = getStatesForScreen(states, screen.id).find((state) => state.id === screen.defaultState)
  return declaredDefault?.id ?? screen.defaultState
}
