import { useRef, useState } from 'react'
import type { EditableProperty } from '../../schemas/adapter'
import { useEditorStore } from '../../features/project/store'
import {
  defaultInspectorStyles,
  inspectorStyleProperties,
  isSafeCssValue,
  parseInspectorNumber,
  type InspectorStyleProperty,
} from '../../features/visual-editing/inspector'
import { createDimensionChange, createPositionChange, createStyleChange, upsertChange } from '../../features/visual-editing/changes'
import { canUseComponentScope, type EditScope } from '../../features/visual-editing/scope'

type InspectorValue = string | number

function isStyleProperty(property: EditableProperty): property is InspectorStyleProperty {
  return inspectorStyleProperties.includes(property as InspectorStyleProperty)
}

function displayValue(value: InspectorValue): string {
  return String(value)
}

interface InspectorInputProps {
  label: string
  value: InspectorValue
  disabled?: boolean
  type?: 'number' | 'text'
  min?: number
  max?: number
  step?: number | 'any'
  onCommit: (value: string) => boolean | void
}

function InspectorInput({ label, value, disabled, type = 'text', min, max, step, onCommit }: InspectorInputProps) {
  const [draft, setDraft] = useState(displayValue(value))
  const [invalid, setInvalid] = useState(false)
  const cancelRef = useRef(false)

  const commit = () => {
    if (cancelRef.current) {
      cancelRef.current = false
      return
    }
    setInvalid(onCommit(draft) === false)
  }

  return (
    <label className={`inspector-field${invalid ? ' inspector-field--invalid' : ''}`}>
      <span>{label}</span>
      <input
        aria-label={label}
        type={type}
        value={draft}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-invalid={invalid}
        onChange={(event) => { cancelRef.current = false; setDraft(event.target.value); setInvalid(false) }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            cancelRef.current = true
            setDraft(displayValue(value))
            setInvalid(false)
            event.currentTarget.blur()
          }
        }}
      />
      {invalid && <span className="inspector-field__error" role="alert">Invalid value</span>}
    </label>
  )
}

function inspectorStep(property: EditableProperty): number | 'any' | undefined {
  if (property === 'opacity') return 0.05
  if (property === 'fontWeight') return 100
  if (property === 'position' || property === 'width' || property === 'height' || property === 'fontSize' || property === 'lineHeight' || property === 'borderRadius') return 'any'
  return undefined
}

function PropertyInput({
  property,
  label,
  value,
  disabled,
  onCommit,
}: {
  property: EditableProperty
  label: string
  value: InspectorValue
  disabled: boolean
  onCommit: (property: EditableProperty, raw: string) => boolean | void
}) {
  const isOpacity = property === 'opacity'
  const isNumber = typeof value === 'number'
  return (
    <div className="inspector-property-row">
      <InspectorInput
        key={`${property}-${displayValue(value)}`}
        label={label}
        value={value}
        disabled={disabled}
        type={isNumber ? 'number' : 'text'}
        min={isOpacity ? 0 : undefined}
        max={isOpacity ? 1 : undefined}
        step={inspectorStep(property)}
        onCommit={(raw) => onCommit(property, raw)}
      />
      {property === 'color' && !disabled && (
        <input className="inspector-color-picker" aria-label="Color picker" type="color" value={typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : '#000000'} onChange={(event) => onCommit(property, event.target.value)} />
      )}
      {property === 'background' && !disabled && (
        <input className="inspector-color-picker" aria-label="Background color picker" type="color" value={typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : '#ffffff'} onChange={(event) => onCommit(property, event.target.value)} />
      )}
    </div>
  )
}

export function InspectorPanel() {
  const selectedElement = useEditorStore((state) => state.selectedElement)
  const project = useEditorStore((state) => state.currentProject)
  const currentScreenId = useEditorStore((state) => state.currentScreenId)
  const currentStateId = useEditorStore((state) => state.currentStateId)
  const commitProject = useEditorStore((state) => state.commitProject)
  const updateSelectionFrame = useEditorStore((state) => state.updateSelectionFrame)
  const updateSelectionStyles = useEditorStore((state) => state.updateSelectionStyles)
  const updateSelectionScopeValues = useEditorStore((state) => state.updateSelectionScopeValues)
  const editScope = useEditorStore((state) => state.editScope)
  const setEditScope = useEditorStore((state) => state.setEditScope)

  if (!selectedElement) {
    return (
      <aside className="side-panel inspector-panel" aria-label="Inspector">
        <div className="panel-heading"><div><p className="eyebrow">Properties</p><h2>Inspector</h2></div></div>
        <div className="panel-empty"><span className="panel-empty__icon" aria-hidden="true">□</span><strong>Nothing selected</strong><span>Click an Adapter-exposed element in the preview.</span></div>
      </aside>
    )
  }

  const screen = project.screens.find((item) => item.id === currentScreenId)
  const state = screen?.states.find((item) => item.id === currentStateId)
  const styles = selectedElement.styles ?? defaultInspectorStyles
  const isEditable = (property: EditableProperty) => selectedElement.editableProperties.includes(property)
  const component = project.components.find((item) => item.id === selectedElement.componentId)
  const componentScopeAllowed = canUseComponentScope(project, selectedElement.componentId, selectedElement.componentInstanceCount ?? 0)
  const scopeValue = (property: string, fallback: InspectorValue): InspectorValue => editScope === 'component'
    ? selectedElement.scopeValues?.[property] ?? fallback
    : fallback
  const updateScopedValue = (property: string, value: InspectorValue) => updateSelectionScopeValues({ ...(selectedElement.scopeValues ?? {}), [property]: value })

  const commitValue = (property: EditableProperty, raw: string): boolean => {
    if (!isEditable(property) || !currentScreenId) return false
    const componentId = selectedElement.componentId
    const elementId = selectedElement.elementId
    const currentFrame = selectedElement.frame
    let change
    let nextFrame = currentFrame
    let nextStyles = styles

    const scope: EditScope = editScope === 'component' && componentScopeAllowed ? 'component' : 'instance'
    if (property === 'position') return false
    if (property === 'width' || property === 'height') {
      const value = parseInspectorNumber(property, raw)
      if (value === undefined) return false
      const currentValue = scopeValue(property, currentFrame[property])
      if (currentValue !== 'Mixed' && currentValue === value) return true
      nextFrame = { ...currentFrame, [property]: value }
      const beforeValue = typeof currentValue === 'number' ? currentValue : currentFrame[property]
      change = createDimensionChange(currentScreenId, currentStateId, elementId, componentId, property, beforeValue, value, undefined, { scope, referenceInstanceId: elementId })
    } else if (isStyleProperty(property)) {
      const displayedValue = scopeValue(property, styles[property])
      const currentValue = displayedValue === 'Mixed' ? styles[property] : displayedValue
      if (typeof currentValue === 'number') {
        const value = parseInspectorNumber(property, raw)
        if (value === undefined) return false
        if (currentValue === value) return true
        if (scope === 'instance' && currentValue === value) return true
        change = createStyleChange(currentScreenId, currentStateId, elementId, componentId, property, currentValue, value, undefined, { scope, referenceInstanceId: elementId })
        nextStyles = { ...styles, [property]: value }
      } else {
        if (!isSafeCssValue(property, raw)) return false
        if (scope === 'instance' && currentValue === raw) return true
        change = createStyleChange(currentScreenId, currentStateId, elementId, componentId, property, currentValue, raw, undefined, { scope, referenceInstanceId: elementId })
        nextStyles = { ...styles, [property]: raw }
      }
    }
    if (!change) return false
    commitProject({ ...project, changes: upsertChange(project.changes, change) })
    if (property === 'width' || property === 'height') updateSelectionFrame(nextFrame)
    if (isStyleProperty(property)) updateSelectionStyles(nextStyles)
    updateScopedValue(property, property === 'width' || property === 'height' ? nextFrame[property] : nextStyles[property as InspectorStyleProperty])
    return true
  }

  const commitPosition = (axis: 'x' | 'y', raw: string): boolean => {
    if (!isEditable('position') || !currentScreenId) return false
    const value = parseInspectorNumber('position', raw)
    if (value === undefined) return false
    if (selectedElement.frame[axis] === value) return true
    const after = { ...selectedElement.frame, [axis]: value }
    const change = createPositionChange(currentScreenId, currentStateId, selectedElement.elementId, selectedElement.componentId, selectedElement.frame, after, undefined, { scope: editScope, referenceInstanceId: selectedElement.elementId })
    commitProject({ ...project, changes: upsertChange(project.changes, change) })
    updateSelectionFrame({ ...selectedElement.frame, [axis]: value })
    return true
  }

  const renderStyleProperty = (property: InspectorStyleProperty, label: string) => (
    isEditable(property) ? <PropertyInput key={`${property}-${scopeValue(property, styles[property])}`} property={property} label={label} value={scopeValue(property, styles[property])} disabled={false} onCommit={commitValue} /> : null
  )

  return (
    <aside className="side-panel inspector-panel" aria-label="Inspector">
      <div className="panel-heading"><div><p className="eyebrow">Properties</p><h2>Inspector</h2></div></div>
      <div className="selection-summary" data-testid="selection-summary">
        <div className="selection-summary__identity"><span className="selection-summary__label">Selected instance</span><strong>{selectedElement.componentId}</strong><span data-testid="selected-instance-id">{selectedElement.elementId}</span></div>
        {selectedElement.selectionPath && selectedElement.selectionPath.length > 0 && <nav className="selection-breadcrumb" aria-label="Selection ancestry" data-testid="selection-breadcrumb">
          {selectedElement.selectionPath.map((item, index) => <span key={`${item.componentId}-${item.instanceId}`} className={index === selectedElement.selectionPath!.length - 1 ? 'selection-breadcrumb__current' : undefined}>{index > 0 && <span aria-hidden="true"> › </span>}{item.componentId}</span>)}
        </nav>}
        {component && <fieldset className="edit-scope" aria-label="Edit scope">
          <legend>Apply to</legend>
          <label><input type="radio" name="edit-scope" value="instance" checked={editScope === 'instance'} onChange={() => setEditScope('instance')} /> This instance</label>
          <label className={!componentScopeAllowed ? 'edit-scope__disabled' : undefined}><input type="radio" name="edit-scope" value="component" checked={editScope === 'component'} disabled={!componentScopeAllowed} onChange={() => setEditScope('component')} /> All instances</label>
        </fieldset>}
        <dl className="inspector-context-grid">
          <div><dt>Component ID</dt><dd>{selectedElement.componentId}</dd></div>
          <div><dt>Instance ID</dt><dd>{selectedElement.elementId}</dd></div>
          <div><dt>Screen</dt><dd>{screen?.name ?? currentScreenId ?? '—'}</dd></div>
          <div><dt>State</dt><dd>{state?.name ?? currentStateId ?? '—'}</dd></div>
        </dl>
        <dl className="measurement-grid">
          <div><dt>X</dt><dd data-testid="measurement-x">{Math.round(selectedElement.frame.x)}</dd></div>
          <div><dt>Y</dt><dd data-testid="measurement-y">{Math.round(selectedElement.frame.y)}</dd></div>
          <div><dt>W</dt><dd data-testid="measurement-width">{Math.round(selectedElement.frame.width)}</dd></div>
          <div><dt>H</dt><dd data-testid="measurement-height">{Math.round(selectedElement.frame.height)}</dd></div>
        </dl>

        {isEditable('position') && <section className="inspector-section"><h3>Position</h3><div className="inspector-fields">
          <InspectorInput key={`x-${selectedElement.frame.x}`} label="X" value={selectedElement.frame.x} type="number" step="any" onCommit={(raw) => commitPosition('x', raw)} />
          <InspectorInput key={`y-${selectedElement.frame.y}`} label="Y" value={selectedElement.frame.y} type="number" step="any" onCommit={(raw) => commitPosition('y', raw)} />
        </div></section>}

        {(isEditable('width') || isEditable('height')) && <section className="inspector-section"><h3>Size</h3><div className="inspector-fields">
          {isEditable('width') && <PropertyInput property="width" label="W" value={scopeValue('width', selectedElement.frame.width)} disabled={false} onCommit={commitValue} />}
          {isEditable('height') && <PropertyInput property="height" label="H" value={scopeValue('height', selectedElement.frame.height)} disabled={false} onCommit={commitValue} />}
        </div></section>}

        {(['fontSize', 'fontWeight', 'lineHeight'] as InspectorStyleProperty[]).some(isEditable) && <section className="inspector-section"><h3>Typography</h3><div className="inspector-fields">{renderStyleProperty('fontSize', 'Font Size')}{renderStyleProperty('fontWeight', 'Font Weight')}{renderStyleProperty('lineHeight', 'Line Height')}</div></section>}
        {(['padding', 'margin', 'gap'] as InspectorStyleProperty[]).some(isEditable) && <section className="inspector-section"><h3>Spacing</h3><div className="inspector-fields">{renderStyleProperty('padding', 'Padding')}{renderStyleProperty('margin', 'Margin')}{renderStyleProperty('gap', 'Gap')}</div></section>}
        {(['color', 'background', 'border', 'borderRadius', 'opacity'] as InspectorStyleProperty[]).some(isEditable) && <section className="inspector-section"><h3>Appearance</h3><div className="inspector-fields">{renderStyleProperty('color', 'Color')}{renderStyleProperty('background', 'Background')}{renderStyleProperty('border', 'Border')}{renderStyleProperty('borderRadius', 'Radius')}{renderStyleProperty('opacity', 'Opacity')}</div></section>}
        <p className="selection-summary__hint">Values are preview-only and follow the Adapter editable list.</p>
      </div>
    </aside>
  )
}
