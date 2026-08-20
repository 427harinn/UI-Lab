import JSZip from 'jszip'
import { getScreenPath, getStatesForScreen, type ImportedMockup } from '../../schemas/adapter'
import { uiLabProjectSchema, type UiChange, type UiLabProject } from '../../schemas/project'
import { stableJson } from '../project/package'
import { codexChangesDocumentSchema, codexExportFormatVersion, codexExportManifestSchema, codexScreensDocumentSchema, type CodexChange } from './schema'
import { previewScopeKey, type PreviewCaptureScope } from './previewCapture'

export const CODEX_EXPORT_FILES = [
  'ui-changes.json',
  'design-tokens.json',
  'screens.json',
  'IMPLEMENTATION.md',
  'DESIGN.md',
] as const

export class CodexExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CodexExportError'
  }
}

function compare(first: string, second: string): number {
  return first.localeCompare(second)
}

function screenFor(project: UiLabProject, screenId: string) {
  return project.screens.find((screen) => screen.id === screenId)
}

function componentFor(project: UiLabProject, componentId: string) {
  return project.components.find((component) => component.id === componentId)
}

function normalizedStateId(project: UiLabProject, change: UiChange): string {
  return change.stateId ?? project.editor.currentStateId ?? 'default'
}

function validateChangeTarget(project: UiLabProject, change: UiChange, stateId: string): void {
  const screen = screenFor(project, change.screenId)
  if (!screen) throw new CodexExportError(`Cannot export change: screen “${change.screenId}” no longer exists in the Adapter.`)
  if (screen.states.length > 0 && !screen.states.some((state) => state.id === stateId)) {
    throw new CodexExportError(`Cannot export change: state “${stateId}” is not declared for screen “${change.screenId}”.`)
  }
  if (!change.componentId) throw new CodexExportError(`Cannot export change for instance “${change.elementId}”: componentId is missing.`)
  const component = componentFor(project, change.componentId)
  if (!component) throw new CodexExportError(`Cannot export change: component “${change.componentId}” no longer exists in the Adapter.`)
  if (!component.editableProperties.includes(change.property)) {
    throw new CodexExportError(`Cannot export change: property “${change.property}” is not editable on component “${change.componentId}”.`)
  }
  if (!change.elementId.trim()) throw new CodexExportError(`Cannot export change: instanceId is empty for component “${change.componentId}”.`)
}

export function resolveFinalCodexChanges(project: UiLabProject): CodexChange[] {
  const projectResult = uiLabProjectSchema.safeParse(project)
  if (!projectResult.success) throw new CodexExportError('The current project is invalid and cannot be exported.')
  if (projectResult.data.changes.length === 0) throw new CodexExportError('No UI changes to export.')

  const final = new Map<string, CodexChange>()
  for (const change of projectResult.data.changes) {
    const stateId = normalizedStateId(projectResult.data, change)
    validateChangeTarget(projectResult.data, change, stateId)
    const key = [change.screenId, stateId, change.elementId, change.property].join('::')
    const previous = final.get(key)
    final.set(key, {
      screenId: change.screenId,
      stateId,
      componentId: change.componentId as string,
      instanceId: change.elementId,
      property: change.property,
      ...(previous?.before !== undefined ? { before: previous.before } : change.before !== undefined ? { before: change.before } : {}),
      after: change.after,
      valueType: change.valueType,
    })
  }

  return [...final.values()].sort((first, second) => (
    compare(first.screenId, second.screenId)
    || compare(first.stateId, second.stateId)
    || compare(first.componentId, second.componentId)
    || compare(first.instanceId, second.instanceId)
    || compare(first.property, second.property)
  ))
}

export function buildCodexScreens(project: UiLabProject, importedMockup: ImportedMockup): Record<string, { name: string; path: string; states: string[]; defaultState?: string }> {
  const screens = Object.fromEntries(importedMockup.screens
    .slice()
    .sort((first, second) => compare(first.id, second.id))
    .map((screen) => [screen.id, {
      name: screen.name,
      path: getScreenPath(screen),
      states: getStatesForScreen(importedMockup.states, screen.id).map((state) => state.id).sort(compare),
      defaultState: screen.defaultState,
    }]))
  const result = codexScreensDocumentSchema.safeParse(screens)
  if (!result.success) throw new CodexExportError('Adapter screen metadata is invalid and cannot be exported.')
  return result.data
}

export function buildImplementationMarkdown(project: UiLabProject, changeCount: number): string {
  return `# UI Lab Implementation Instructions

## Purpose

This package contains visual changes created in UI Lab so they can be implemented in the real application. It is a Codex implementation package, separate from the '.ui-project' editing-session format.

## Important rules

- Preserve the existing application architecture.
- Respect the existing React, CSS, Flex, Grid, and responsive structure.
- UI Lab raw coordinates are editor-space measurements. Do not automatically implement them as position: absolute; left: ...; top: ...;.
- For each change: inspect the existing component layout, preserve Flex/Grid/responsive behavior, infer spacing/alignment/size changes, implement the smallest source-level change, and compare against the supplied screenshot.
- Only use absolute positioning when the existing UI already requires it.
- exact means use the specified value in the implementation unless the existing design system provides an equivalent token.
- visual means a visual target. Reinterpret it within the existing layout; do not copy raw px coordinates into absolute positioning.
- target means an approximate goal and may be implemented with the closest stable source-level value.
- componentId is the primary implementation target.
- instanceId is a visual reference. An instance-specific override is allowed only when a clear exception is required; do not hard-code a DOM instance merely because UI Lab edited it.
- Preserve behavior and business logic. Do not change unrelated UI.

## Files

- ui-changes.json: normalized, final-state change records sorted by screen, state, component, instance, and property.
- design-tokens.json: the Adapter's semantic token structure, excluding editor transient values.
- screens.json: screen routes, states, and default states from validated Adapter metadata.
- IMPLEMENTATION.md: implementation rules and production-safety guidance.
- DESIGN.md: visual intent and context.
- screenshots/: visual reference images for each changed screen/state.

## Changes

Read ui-changes.json. Resolve each record against the semantic component first. Same-scope records have already been resolved to one final state; do not re-apply stale intermediate values.

## Screenshots

Screenshots are visual references, not source code. Compare GUI changes against the relevant screen/state image after implementation.

## Validation

Run the existing lint, typecheck, unit/integration tests, and build after changes. For GUI changes, use Playwright or an equivalent browser check and compare against the supplied screenshots.

## Production safety

Codex must not delete unrelated application code, rewrite entire components unnecessarily, change API/business logic unless required by the UI change, remove accessibility behavior, remove responsive behavior, or replace the design-system architecture without reason. Use existing design tokens where equivalent, modify shared components for semantic/shared changes, use instance-specific overrides only when explicitly necessary, run existing quality gates, and provide screenshots for GUI changes.

## Export summary

- Project: ${project.name}
- Changes: ${changeCount}
- Export formatVersion: 1
`
}

function formatValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

export function buildDesignMarkdown(project: UiLabProject, importedMockup: ImportedMockup, changes: CodexChange[]): string {
  const screens = buildCodexScreens(project, importedMockup)
  const componentSummaries = [...new Set(changes.map((change) => change.componentId))].sort(compare)
  const lines = [
    '# UI Lab Design Context',
    '',
    `- Project: ${project.name}`,
    `- Viewport: ${project.viewport.width} × ${project.viewport.height}px`,
    '',
    '## Tokens',
    '',
    '```json',
    stableJson(project.tokens).trimEnd(),
    '```',
    '',
    '## Screens',
    '',
  ]
  for (const [screenId, screen] of Object.entries(screens)) {
    lines.push(`- ${screenId}: ${screen.name} (${screen.path}) — states: ${screen.states.join(', ') || 'none'}${screen.defaultState ? `; default: ${screen.defaultState}` : ''}`)
  }
  lines.push('', '## Components', '')
  for (const componentId of componentSummaries) lines.push(`- ${componentId}`)
  lines.push('', '## UI Lab changes', '')
  for (const change of changes) {
    lines.push(`- ${change.componentId} / ${change.instanceId} / ${change.screenId} / ${change.stateId}: ${change.property} (${change.valueType}) ${formatValue(change.before)} → ${formatValue(change.after)}`)
  }
  lines.push('', 'This document describes the intended visual result. IMPLEMENTATION.md describes how to implement it safely within the existing application architecture.', '')
  return lines.join('\n')
}

function safeProjectName(name: string): string {
  const safe = name.normalize('NFKC').trim().replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ').replace(/[. ]+$/g, '')
  return safe || 'Untitled UI Project'
}

export function codexExportFilename(projectName: string): string {
  return `${safeProjectName(projectName)}-ui-changes.zip`
}

function pngBytes(value: Uint8Array): boolean {
  return value.length > 8
    && value[0] === 0x89 && value[1] === 0x50 && value[2] === 0x4e && value[3] === 0x47
    && value[4] === 0x0d && value[5] === 0x0a && value[6] === 0x1a && value[7] === 0x0a
}

export async function serializeCodexExport(
  project: UiLabProject,
  importedMockup: ImportedMockup | undefined,
  captureScreenshots: (scopes: PreviewCaptureScope[]) => Promise<Record<string, Uint8Array>>,
): Promise<Uint8Array> {
  if (!importedMockup || project.source.type !== 'mockup') throw new CodexExportError('A valid imported mockup and available preview are required for Codex Export.')
  const projectResult = uiLabProjectSchema.safeParse(project)
  if (!projectResult.success) throw new CodexExportError('The current project is invalid and cannot be exported.')
  const changes = resolveFinalCodexChanges(projectResult.data)
  const screens = buildCodexScreens(projectResult.data, importedMockup)
  const uiChanges = codexChangesDocumentSchema.parse({ formatVersion: codexExportFormatVersion, project: projectResult.data.name, changes })
  const scopeMap = new Map<string, PreviewCaptureScope>()
  for (const change of changes) {
    const key = previewScopeKey(change)
    const scope = scopeMap.get(key) ?? { screenId: change.screenId, stateId: change.stateId, targets: [] }
    if (!scope.targets?.some((target) => target.componentId === change.componentId && target.instanceId === change.instanceId)) {
      scope.targets?.push({ componentId: change.componentId, instanceId: change.instanceId })
    }
    scopeMap.set(key, scope)
  }
  const scopes = [...scopeMap.values()]
    .sort((first, second) => previewScopeKey(first).localeCompare(previewScopeKey(second)))
  let screenshots: Record<string, Uint8Array>
  try {
    screenshots = await captureScreenshots(scopes)
  } catch (error) {
    throw new CodexExportError(`Codex Export failed because a reference screenshot could not be generated: ${error instanceof Error ? error.message : 'unknown screenshot error'}`)
  }
  for (const scope of scopes) {
    const bytes = screenshots[previewScopeKey(scope)]
    if (!bytes || !pngBytes(bytes)) throw new CodexExportError(`Codex Export failed because screenshot ${scope.screenId}-${scope.stateId}.png is missing or invalid.`)
  }

  const manifest = codexExportManifestSchema.parse({
    formatVersion: codexExportFormatVersion,
    packageType: 'codex-ui-changes',
    project: projectResult.data.name,
    requiredEntries: [...CODEX_EXPORT_FILES, 'screenshots/'],
  })
  const zip = new JSZip()
  const fileOptions = { date: new Date(0) }
  zip.file('manifest.json', stableJson(manifest), fileOptions)
  zip.file('ui-changes.json', stableJson(uiChanges), fileOptions)
  zip.file('design-tokens.json', stableJson(projectResult.data.tokens), fileOptions)
  zip.file('screens.json', stableJson(screens), fileOptions)
  zip.file('IMPLEMENTATION.md', buildImplementationMarkdown(projectResult.data, changes.length), fileOptions)
  zip.file('DESIGN.md', buildDesignMarkdown(projectResult.data, importedMockup, changes), fileOptions)
  for (const scope of scopes) zip.file(`screenshots/${scope.screenId}-${scope.stateId}.png`, screenshots[previewScopeKey(scope)], fileOptions)
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 }, platform: 'DOS' })
}
