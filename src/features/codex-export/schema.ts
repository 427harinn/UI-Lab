import { z } from 'zod'

export const codexExportFormatVersion = 1 as const

export const codexValueTypeSchema = z.enum(['exact', 'target', 'visual'])

export const codexChangeSchema = z.object({
  screenId: z.string().min(1),
  stateId: z.string().min(1),
  componentId: z.string().min(1),
  instanceId: z.string().min(1),
  property: z.string().min(1),
  before: z.unknown().optional(),
  after: z.unknown(),
  valueType: codexValueTypeSchema,
}).strict()

export const codexChangesDocumentSchema = z.object({
  formatVersion: z.literal(codexExportFormatVersion),
  project: z.string().min(1),
  changes: z.array(codexChangeSchema),
}).strict()

export const codexScreenSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  states: z.array(z.string().min(1)),
  defaultState: z.string().min(1).optional(),
}).strict()

export const codexScreensDocumentSchema = z.record(z.string().min(1), codexScreenSchema)

export const codexExportManifestSchema = z.object({
  formatVersion: z.literal(codexExportFormatVersion),
  packageType: z.literal('codex-ui-changes'),
  project: z.string().min(1),
  requiredEntries: z.array(z.string().min(1)),
}).strict()

export type CodexChange = z.infer<typeof codexChangeSchema>
export type CodexChangesDocument = z.infer<typeof codexChangesDocumentSchema>
export type CodexScreensDocument = z.infer<typeof codexScreensDocumentSchema>
