# UI Lab Requirements v1

## 1. Purpose

UI Lab is a browser-based visual UI editor used to refine imported frontend mockups and export precise UI change specifications for Codex.

The core workflow is:

```text
Mockup Project
  -> UI Lab Import
  -> Visual adjustment
  -> UI Lab Project save
  -> Codex Export
  -> Codex applies the changes to the production project
```

UI Lab does not directly rewrite the production HouseToDo source code.

## 2. Scope

UI Lab v1 must support:

- project state management
- editor shell
- screen/state/viewport selection foundations
- visual editing in later milestones
- project import/export in later milestones
- Codex-oriented export in later milestones

Milestone 1 focuses only on the application foundation.

## 3. External adapter contract

Imported mockups must follow `UI_LAB_ADAPTER_SPEC_v1.md`.

UI Lab must treat that adapter as an external contract.

Important v1 rules include:

- mockups are built React + Vite + TypeScript projects
- preview entry is declared by `.uilab/project.json`
- navigation uses Hash Router-compatible routes
- semantic component identity uses `data-uilab-component`
- rendered instance identity uses `data-uilab-id`
- imported mockups are trusted local projects
- iframe DOM inspection must remain possible
- UI Lab does not parse or rewrite mockup React source
- UI Lab does not require a backend to render mockups

Milestone 1 must define internal types so these requirements can be consumed later, but must not implement mockup ZIP import yet.

## 4. Technology

Required:

- React
- TypeScript
- Vite
- Zustand
- Zod
- Vitest
- Testing Library

Planned for later milestones:

- react-moveable
- Motion
- JSZip
- Storybook
- Playwright

Do not introduce later-milestone libraries unless required by Milestone 1 infrastructure.

## 5. UI structure

The main editor uses a three-pane layout:

```text
+-------------+--------------------------+-----------------+
| Left Panel  | Preview                  | Inspector       |
|             |                          |                 |
| Screens     | Smartphone viewport      | Selected item   |
| States      |                          | properties      |
+-------------+--------------------------+-----------------+
```

A top toolbar provides:

- project name
- viewport selector
- undo
- redo
- import placeholder
- project export placeholder
- Codex export placeholder

Milestone 1 may render inactive placeholders for functionality assigned to later milestones.

## 6. Viewport presets

Initial presets:

- 375 x 667
- 375 x 812
- 390 x 844
- 393 x 852
- 430 x 932
- Custom

Default:

- 390 x 844

Changing viewport size must change the preview frame dimensions in state.

Do not implement device emulation beyond width/height in Milestone 1.

## 7. Internal project model

Minimum model:

```ts
export interface UiLabProject {
  formatVersion: 1
  id: string
  name: string

  source?: {
    type: 'blank' | 'mockup'
    name?: string
  }

  viewport: {
    width: number
    height: number
  }

  screens: UiLabScreen[]
  components: UiLabComponentDefinition[]
  tokens: Record<string, unknown>
  changes: UiChange[]

  editor: {
    currentScreenId?: string
    currentStateId?: string
    selectedElementId?: string
  }
}
```

Supporting schemas should be defined with Zod.

## 8. Change model

Milestone 1 must define the change model even though visual editing is implemented later.

```ts
export type ChangeValueType = 'exact' | 'target' | 'visual'

export interface UiChange {
  id: string
  screenId: string
  stateId?: string
  elementId: string
  componentId?: string
  property: string
  before?: unknown
  after: unknown
  valueType: ChangeValueType
  updatedAt: string
}
```

Meaning:

- `exact`: Codex should normally use the value directly.
- `target`: a desired visual target; implementation may differ slightly.
- `visual`: editor-only visual reference; must not be translated directly into absolute positioning without justification.

## 9. State management

Use Zustand.

Separate responsibilities logically:

### Project state

- current project
- create blank project
- replace project
- update project metadata
- persistence

### Editor state

- current screen
- current mock state
- viewport
- selected element
- zoom placeholder if needed later

### History state

- past
- present
- future
- undo
- redo
- canUndo
- canRedo

Implementation may use separate stores or slices if that keeps the architecture simpler.

## 10. Persistence

Milestone 1 uses localStorage.

Requirements:

- project state survives browser reload
- invalid/corrupt persisted data does not crash the application
- persisted data is validated before restoration
- failed restoration falls back to a clean blank project

Use one namespaced storage key.

## 11. Undo / Redo foundation

Undo/Redo must exist in Milestone 1.

It must support at least representative project/editor mutations used in tests.

Later visual-edit operations will be added to the same history mechanism.

Important rule:

- continuous pointer movement must eventually become one committed history action, not hundreds of actions

Milestone 1 only needs the foundation/API and tests for normal commits.

## 12. Editor shell

Milestone 1 must render:

- top toolbar
- left panel
- central preview area
- right inspector panel
- preview viewport frame

The UI should be functional and neutral.

Do not spend time implementing HouseToDo visual design.

UI Lab is a development tool.

## 13. Empty project

A new blank project must be creatable without a mockup.

Default project:

```json
{
  "formatVersion": 1,
  "name": "Untitled UI Project",
  "source": {
    "type": "blank"
  },
  "viewport": {
    "width": 390,
    "height": 844
  },
  "screens": [],
  "components": [],
  "tokens": {},
  "changes": []
}
```

Generate `id` using `crypto.randomUUID()`.

## 14. Validation

Zod validation is required for:

- UI Lab project
- viewport dimensions
- screens
- component definitions
- change records

Schema parsing must be testable independently.

## 15. Error handling

Milestone 1 requires basic application-level resilience:

- corrupt localStorage -> fallback project
- invalid viewport values -> reject or normalize safely
- schema validation errors -> typed/structured result where practical

Detailed Import error UI belongs to Milestone 2.

## 16. Testing

Minimum Milestone 1 tests:

- blank project creation
- project schema accepts valid project
- project schema rejects invalid format version
- invalid persisted project falls back safely
- valid persisted project restores
- viewport update changes state
- undo restores previous state
- redo restores undone state
- history flags (`canUndo`, `canRedo`) behave correctly

UI tests:

- editor shell renders all three panes
- toolbar renders viewport selector
- viewport preset can be changed

## 17. Quality gates

All must pass:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

If scripts have different names, create equivalent scripts.

## 18. Milestone 1 non-goals

Do not implement:

- HouseToDo Home
- HouseToDo Calendar
- HouseToDo Shopping
- mockup ZIP import
- JSZip integration
- iframe mockup loading
- adapter file loading
- react-moveable
- drag
- resize
- snapping
- visual inspector property editing
- `.ui-project` ZIP export
- Codex export
- screenshot export
- Storybook
- backend
- authentication
- source-code parsing
- source-code rewriting

## 19. Completion definition

Milestone 1 is complete when:

- app starts
- TypeScript has no errors
- editor shell renders
- viewport can be changed
- blank project model works
- Zustand state is persisted
- state restores after reload
- schema validation is implemented
- undo/redo foundation is implemented and tested
- lint passes
- tests pass
- build passes
- no HouseToDo mockup/editor functionality from later milestones was implemented

## 20. Design principle for UI Lab itself

UI Lab should prioritize:

1. clear editing workflow
2. predictable state
3. inspectability
4. maintainability
5. extensibility for later milestones

Do not optimize UI Lab itself for consumer-app visual polish during Milestone 1.
