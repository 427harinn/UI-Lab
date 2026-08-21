# HouseToDo Acceptance Baseline

## Upstream fixture

- Repository: `427harinn/HouseToDo-Mockup`
- Merge commit: `2f8821b170c73b09b158a9a390a42e17e2e7f505`
- Artifact: `e2e/fixtures/house-todo/HouseToDo-Mockup-uilab-v1.zip`
- SHA256: `D1237D048DFB03711C83B1A55DCCB78425C7EC4633A4DB5B56C9DF06FD920ADE`

The ZIP is a committed, offline fixture. The acceptance test verifies its
SHA256 before reading or importing it. A mismatch stops the test with an
explicit fixture-changed error.

## Adapter-derived metadata

The E2E helper reads the five `.uilab` metadata documents from the ZIP with
JSZip on every test run. Screen IDs, state IDs, component IDs, routes, and
state iteration are derived from those validated documents. The test does not
use fixed screen, state, or component count expectations, so metadata can grow
without changing an unrelated assertion.

## Coverage

- Import and Adapter screen identity
- All metadata-derived screens and states, route/hash readiness, non-blank iframe rendering, and fatal runtime errors
- Representative Adapter target discovery after screen/state changes
- Home task-row background and task-form name font-size editing
- Undo and Redo restoration/reapplication
- Project Export → Import Project round trip for viewport, metadata, current scope, preview, and changes
- Codex Export manifest, semantic change records, design tokens, documentation, and PNG references

## Known follow-ups

- Discovery lifecycle: consider optional rediscovery after async framework render, hash route transitions, or DOM mutations, plus an optional Adapter readiness signal.
- Interactive selection: the mockup's native row click action can compete with UI Lab selection; future Select/Interact modes, selection modifiers, or editor-overlay affordances may clarify that boundary.

These follow-ups are documented only; they are not implemented by this
acceptance milestone.
