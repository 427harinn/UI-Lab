# UI Lab Milestones

## Milestone 1 — Foundation

Status: COMPLETE

Implemented:

- React/Vite/TypeScript foundation
- strict typing
- Zustand project/editor/history store
- Zod schemas
- blank project factory
- safe localStorage persistence
- undo/redo
- three-pane editor shell
- viewport presets
- tests/documentation

Reported quality gate:

- Lint: passed
- Typecheck: passed
- Tests: 5 files / 14 tests passed
- Build: passed

Known non-blocking issue:

- jsdom engine warning on Node 22.18.0

---

## Milestone 2 — Mockup Import

Status: COMPLETE

Branch:

```text
feat/m2-mockup-import
```

Goal:

Import a trusted `UI_LAB_ADAPTER_SPEC_v1.md` compatible mockup ZIP and render its screens/states inside an iframe.

Scope:

- JSZip
- adapter validation
- project entry validation
- single-file preview loading
- iframe
- DOM-access readiness check
- Hash Router route construction
- Screens panel integration
- States panel integration
- default viewport
- Import error UX
- tests
- PR creation

Implemented:

- Adapter v1 Zod validation and JSZip import
- Single-file Blob URL iframe preview with DOM access readiness check
- Hash route construction for screen/state changes
- Screens, states, components, tokens, and default viewport integration
- Trusted local import UX and readable validation/load errors
- Re-import-required persistence behavior documentation
- Synthetic importer and UI coverage

Excluded:

- react-moveable
- selection
- drag
- resize
- Inspector editing
- Project ZIP export
- Codex Export
- screenshots

Exit criteria:

See `UI_LAB_MILESTONE2_SPEC.md`.

---

## Milestone 3 — Visual Editing

Status: COMPLETE

Branch:

```text
feat/m3-visual-editing
```

Goal:

Select adapter-exposed elements and visually move/resize them.

Planned:

- react-moveable
- instance discovery
- selection
- drag
- resize
- snap
- guides
- measurements

Implemented:

- Adapter selector-based editable element discovery
- semantic component / rendered instance selection
- iframe-local Moveable overlay and control box
- Adapter-gated drag and resize with live measurements
- viewport, horizontal, vertical, and editable-element snapping guides
- temporary visual transforms and dimensions
- one history commit per completed drag or resize
- selection reset and iframe target re-resolution lifecycle
- unit and Playwright integration coverage

---

## Milestone 4 — Inspector

Status: COMPLETE

Branch:

```text
feat/m4-inspector
```

Goal:

Numerically edit adapter-allowed visual properties.

Implemented:

- Adapter-gated Inspector fields for geometry, spacing, typography, appearance, and opacity
- Computed style snapshots with serializable values and iframe-local baseline declarations
- Exact/visual property classification and shared `UiChange` records
- Preview-only inline style overrides with project-change reapplication after reload
- One history transaction per committed input on blur/Enter, with scoped latest-change replacement
- Undo/Redo, lifecycle selection reset, validation, synthetic UI coverage, and M4 screenshots

---

## Milestone 5 — Project Import / Export

Status: COMPLETE

Goal:

Save and restore `.ui-project` editing sessions.

Implemented:

- Independent `.ui-project` formatVersion 1 ZIP package
- Zod validation for project, Adapter metadata, viewport, screens/states/components/tokens, changes, and preview
- Deterministic JSON serialization and safe project filenames
- Explicit Import Mockup / Import Project / Export Project toolbar commands
- Atomic Project Import with readable error categories and unchanged current preview on failure
- Preview HTML restore, iframe recreation, viewport/editor restore, and project change reapplication
- Migration entry point for future package versions
- localStorage remains metadata-only; Project Import resets undo/redo history
- Unit, integration, and Playwright evidence under `docs/screenshots/m5/`

Excluded:

- Codex Export, source rewriting, cloud storage, binary autosave, and collaboration

---

## Milestone 6 — Codex Export

Status: TODO

Goal:

Generate change specifications and reference screenshots for Codex.

---

## Milestone 7 — Quality / UX

Status: TODO

Goal:

Visual regression, Storybook, shortcuts, and editing UX hardening.
