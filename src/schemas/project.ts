import { z } from 'zod'

export const viewportSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

export const screenStateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
})

export const screenSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  route: z.string().optional(),
  states: z.array(screenStateSchema).default([]),
})

export const componentDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  selector: z.string().min(1).optional(),
  instances: z.enum(['single', 'multiple']).optional(),
  editableProperties: z.array(z.string()).default([]),
})

export const changeValueTypeSchema = z.enum(['exact', 'target', 'visual'])

export const uiChangeSchema = z.object({
  id: z.string().min(1),
  screenId: z.string().min(1),
  stateId: z.string().optional(),
  elementId: z.string().min(1),
  componentId: z.string().optional(),
  property: z.string().min(1),
  before: z.unknown().optional(),
  after: z.unknown(),
  valueType: changeValueTypeSchema,
  updatedAt: z.string().datetime(),
})

export const projectEditorSchema = z.object({
  currentScreenId: z.string().optional(),
  currentStateId: z.string().optional(),
  selectedElementId: z.string().optional(),
})

export const uiLabProjectSchema = z.object({
  formatVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  source: z.object({
    type: z.enum(['blank', 'mockup']),
    name: z.string().optional(),
  }),
  viewport: viewportSchema,
  screens: z.array(screenSchema),
  components: z.array(componentDefinitionSchema),
  tokens: z.record(z.string(), z.unknown()),
  changes: z.array(uiChangeSchema),
  editor: projectEditorSchema.default({}),
})

export type Viewport = z.infer<typeof viewportSchema>
export type UiLabScreen = z.infer<typeof screenSchema>
export type UiLabComponentDefinition = z.infer<typeof componentDefinitionSchema>
export type ChangeValueType = z.infer<typeof changeValueTypeSchema>
export type UiChange = z.infer<typeof uiChangeSchema>
export type UiLabProject = z.infer<typeof uiLabProjectSchema>
