# UI Lab Milestone 2 Specification — Mockup Import

## 1. Goal

Milestone 2 adds support for importing a trusted UI Lab Adapter v1 compatible mockup ZIP and rendering it inside UI Lab.

This milestone does not add visual editing.

The imported mockup contract is defined by:

- `UI_LAB_ADAPTER_SPEC_v1.md`

That document is authoritative for mockup package structure and adapter semantics.

## 2. Branch / PR workflow

All Milestone 2 work must be performed on:

```text
feat/m2-mockup-import
```

Workflow:

1. update local `main`
2. create/switch to `feat/m2-mockup-import`
3. implement Milestone 2
4. run full quality gate
5. commit
6. push branch
7. create Pull Request
8. do not merge automatically

PR must include:

- implementation summary
- major files changed
- tests executed and results
- known limitations
- explicit confirmation that Milestone 3+ functionality was not implemented

## 3. Scope

Implement:

- Mockup ZIP selection/import
- JSZip integration
- `.uilab` adapter file extraction
- Zod validation
- `project.entry` validation
- single-file HTML preview loading
- iframe preview
- Hash Router route construction
- screen list population
- state list population
- screen switching
- state switching
- viewport application
- trusted imported preview DOM accessibility check
- user-facing import errors
- imported project persistence metadata as appropriate

Do not implement:

- Moveable
- drag
- resize
- snapping
- guides
- Inspector property editing
- CSS override editing
- `.ui-project` ZIP export
- Codex Export
- screenshots
- source parsing
- source rewriting

## 4. Required package contract

Minimum expected ZIP:

```text
HouseToDo-Mockup.zip
├─ dist/
│  └─ index.html
└─ .uilab/
   ├─ project.json
   ├─ screens.json
   ├─ components.json
   ├─ tokens.json
   └─ states.json
```

`project.json` must contain:

```json
{
  "formatVersion": 1,
  "name": "HouseToDo Mockup",
  "entry": "dist/index.html",
  "defaultViewport": {
    "width": 390,
    "height": 844
  }
}
```

## 5. Adapter schemas

Milestone 2 must add adapter-specific Zod schemas matching Adapter v1.

Required:

- adapter project schema
- screens schema
- components schema
- tokens schema
- states schema
- editable property enum
- `instances: "single" | "multiple"`

Allowed editable property keys:

```text
position
width
height
padding
margin
gap
fontSize
fontWeight
lineHeight
color
background
border
borderRadius
opacity
```

Unknown required fields must fail validation cleanly.

Additional unknown fields may be allowed only if doing so preserves forward-compatible behavior intentionally and is documented.

## 6. Import UX

The existing disabled Import command becomes active.

Expected flow:

```text
Import
  ↓
Choose .zip
  ↓
Read ZIP
  ↓
Validate required files
  ↓
Validate adapter JSON
  ↓
Validate entry exists
  ↓
Load preview
  ↓
Populate Screens / States
```

During import:

- show a lightweight loading state
- prevent duplicate concurrent imports
- clear prior import error when a new import starts

On success:

- show imported project name
- apply adapter default viewport
- select first/appropriate screen
- use that screen's default state

## 7. Import result model

Create a typed imported mockup model.

Suggested shape:

```ts
interface ImportedMockup {
  name: string
  formatVersion: 1
  entry: string
  defaultViewport: {
    width: number
    height: number
  }
  screens: AdapterScreens
  components: AdapterComponents
  tokens: Record<string, unknown>
  states: AdapterStates
  previewHtml: string
}
```

The exact internal structure may differ if there is a cleaner design.

Do not store JSZip objects directly in Zustand.

## 8. Preview loading

Adapter v1 prefers a single-file `dist/index.html`.

Milestone 2 should support the preferred single-file path first.

Recommended implementation:

1. read `project.entry` from ZIP
2. get HTML as text
3. create preview document URL suitable for iframe use
4. append/use Hash Router route and state
5. set iframe source
6. revoke stale object URLs when replaced/unmounted

Important:

- avoid memory leaks from unreleased Blob/Object URLs
- do not execute imported code in the parent application context
- imported preview code executes only within iframe
- imported project is trusted local content for v1

## 9. DOM accessibility

Milestone 3 needs parent access to imported iframe DOM.

Milestone 2 must verify that the chosen preview execution strategy allows access to:

```ts
iframe.contentDocument
iframe.contentWindow
```

After load, perform a basic readiness/access check.

If parent DOM access is unavailable:

- show a clear import/preview error
- do not silently continue

Do not implement element selection yet.

## 10. Routing

Adapter v1 routing contract:

```text
{entry}#{path}?uilabState={state}
```

Examples:

```text
#/home?uilabState=normal
#/home?uilabState=overdue
#/shopping?uilabState=normal
```

UI Lab owns route construction.

The mockup owns rendering the requested route/state.

Create one tested utility for route/hash construction.

Avoid constructing URLs ad hoc throughout the UI.

## 11. Screen selection

After successful import:

- left panel shows adapter screens
- selecting a screen updates preview route
- selected screen persists in editor state
- when changing screen, default to that screen's `defaultState`

If that screen has no matching state entry, still allow the screen to render using its defaultState route parameter.

## 12. State selection

For current screen:

- list states from `states.json`
- selecting state updates preview URL/hash
- current state is stored in editor state

Unknown states are a mockup-side fallback concern, but UI Lab should only present states declared by adapter.

## 13. Viewport

On import success:

- set viewport to adapter `defaultViewport`
- existing viewport presets/custom behavior remains usable
- changing viewport does not re-import the project

## 14. Components and tokens in Milestone 2

Read and validate:

- `components.json`
- `tokens.json`

Store them for future milestones.

Do not yet:

- highlight editable elements
- modify component styles
- modify tokens

## 15. Error cases

At minimum handle:

- selected file is not a readable ZIP
- `.uilab/project.json` missing
- `screens.json` missing
- `components.json` missing
- `tokens.json` missing
- `states.json` missing
- invalid JSON
- unsupported `formatVersion`
- invalid schema
- `project.entry` missing
- entry path not found in ZIP
- iframe preview fails to load
- iframe DOM cannot be inspected

Errors should be understandable.

Avoid dumping raw stack traces to the user.

Developer details may be logged to console.

## 16. Persistence

Milestone 1 localStorage persistence must continue to work.

Do not persist raw preview Blob URLs.

At minimum persist enough metadata to keep application state sane after reload.

If full imported ZIP restoration is not implemented in Milestone 2, document that re-import is required after reload.

Do not quietly serialize large ZIP/binary data into localStorage.

## 17. Security scope

v1 supports trusted local mockup imports only.

Requirements:

- no remote URL import
- no arbitrary npm install
- no executing ZIP contents in parent context
- no source parsing
- no backend execution

Add a small trusted-import note in the Import UI or documentation.

## 18. Testing

Unit tests:

- valid adapter project schema
- invalid formatVersion rejected
- valid screens schema
- invalid components editable key rejected
- missing entry detected
- route/hash construction
- default state resolution
- ZIP missing required files
- invalid JSON handling

UI/integration tests:

- Import command becomes enabled
- successful mock import populates screens
- successful mock import populates states
- changing screen changes current screen
- changing state changes current state
- default viewport applied after import
- import error is visible for invalid package

Use a minimal test fixture ZIP generated during tests rather than relying on HouseToDo mockup.

## 19. Quality gate

Must pass:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## 20. Exit criteria

Milestone 2 is complete when:

- adapter-compatible mockup ZIP can be selected
- all required `.uilab` files are validated
- project entry is validated
- preview loads inside iframe
- parent UI Lab can access iframe DOM
- Screens panel is populated
- States panel is populated
- screen switching works
- state switching works
- adapter default viewport is applied
- errors are handled cleanly
- lint/typecheck/tests/build pass
- PR is created from `feat/m2-mockup-import`
- no Milestone 3+ functionality was implemented
