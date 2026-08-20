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

Status: TODO / NEXT

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

Status: TODO

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

---

## Milestone 4 — Inspector

Status: TODO

Goal:

Numerically edit adapter-allowed visual properties.

---

## Milestone 5 — Project Import / Export

Status: TODO

Goal:

Save and restore `.ui-project` editing sessions.

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
