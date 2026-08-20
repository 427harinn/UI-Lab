# UI Lab Milestones

## Overall Goal

Build a visual UI editor that imports adapter-compatible mockups, lets the user refine the UI visually, and exports machine-readable UI change specifications plus reference screenshots for Codex.

The external mockup contract is `UI_LAB_ADAPTER_SPEC_v1.md`.

---

## Milestone 1 — Foundation

### Goal

Create a stable application/editor foundation without implementing mockup import or visual manipulation.

### Scope

- React + Vite + TypeScript
- application structure
- three-pane editor shell
- viewport frame and preset selection
- Zustand project/editor/history state
- Zod schemas
- blank project creation
- localStorage persistence
- safe restore/fallback
- undo/redo foundation
- lint/typecheck/test/build
- unit/UI tests

### Explicitly excluded

- Mockup ZIP import
- JSZip
- iframe preview loading
- react-moveable
- drag/resize
- Inspector editing
- Project ZIP import/export
- Codex export
- screenshots
- Storybook
- HouseToDo mockups

### Exit criteria

All requirements in `UI_LAB_REQUIREMENTS_v1.md` section "Completion definition" pass.

Status: COMPLETE

### Validation record

- `npm run lint` — passed.
- `npm run typecheck` — passed with strict TypeScript enabled.
- `npm test` — passed: 4 test files, 12 tests.
- `npm run build` — passed: Vite production build completed.

Implemented the editor shell, viewport presets, Zod project schemas, blank project factory, typed Zustand project/editor/history state, safe localStorage persistence, and undo/redo foundation. The adapter contract remains external and was not loaded or implemented here; `UI_LAB_ADAPTER_SPEC_v1.md` was not present in the repository during implementation.

Confirmed non-goals: no HouseToDo mockup screens, Mockup Import, JSZip, iframe mockup execution, react-moveable, drag/resize, Inspector editing, project ZIP import/export, screenshot export, or Codex Export were implemented.

---

## Milestone 2 — Mockup Import

### Goal

Import a trusted adapter-compatible built mockup and display its screens/states in the preview.

### Scope

- JSZip
- `.uilab/project.json`
- `screens.json`
- `components.json`
- `states.json`
- `tokens.json`
- adapter validation
- `project.entry`
- trusted single-file preview
- iframe DOM access
- Hash Router URL construction
- screen switching
- state switching
- viewport application
- Import errors

Status: TODO

---

## Milestone 3 — Visual Editing

### Goal

Allow direct selection, movement, resizing, snapping and visual measurement of adapter-exposed DOM elements.

### Scope

- react-moveable
- iframe element discovery
- component/instance identity
- click selection
- move
- resize
- snap
- guides
- selection overlay
- X/Y/W/H display
- committed changes added to history

Status: TODO

---

## Milestone 4 — Inspector

### Goal

Edit supported visual properties numerically from the right panel.

### Scope

- position
- width
- height
- padding
- margin
- gap
- font size
- font weight
- line height
- text color
- background
- border
- border radius
- opacity
- editable-property restrictions from adapter
- exact/target/visual classification
- preview overrides
- change records

Status: TODO

---

## Milestone 5 — UI Lab Project Import / Export

### Goal

Persist and transport UI Lab editing sessions.

### Scope

- `.ui-project`
- ZIP format
- Project Export
- Project Import
- schema validation
- editor-state restore
- format-version migration foundation

Status: TODO

---

## Milestone 6 — Codex Export

### Goal

Generate a complete implementation handoff package.

### Scope

- `ui-changes.json`
- `design-tokens.json`
- `screens.json`
- `IMPLEMENTATION.md`
- reference screenshots
- ZIP generation
- Exact / Target / Visual sections
- implementation constraints for Codex

Status: TODO

---

## Milestone 7 — Quality and Editing UX

### Goal

Harden the editor for regular use.

### Scope

- Storybook
- Playwright
- visual regression
- keyboard shortcuts
- improved error UX
- reduced motion
- editor polish
- larger state/project test coverage

Status: TODO
