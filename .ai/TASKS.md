# UI Lab Tasks

## Milestone 1 — Foundation

### M1-01 Project bootstrap

- [x] Create React + Vite + TypeScript project.
- [x] Configure strict TypeScript.
- [x] Configure ESLint.
- [x] Configure Vitest + Testing Library.
- [x] Add `typecheck` script.
- [x] Confirm initial lint/typecheck/test/build.

### M1-02 Base application structure

- [x] Create `src/components/editor`.
- [x] Create `src/components/panels`.
- [x] Create `src/features/project`.
- [x] Keep unused future areas out of the implementation; do not implement later milestones.

### M1-03 Core schemas

- [x] Add `formatVersion: 1`.
- [x] Define viewport schema.
- [x] Define screen schema.
- [x] Define component-definition schema.
- [x] Define `exact | target | visual`.
- [x] Define change schema.
- [x] Define UI Lab project schema.
- [x] Export inferred TypeScript types from Zod where practical.
- [x] Test valid project.
- [x] Test invalid format version.
- [x] Test invalid viewport.

### M1-04 Blank project factory

- [x] Add blank project factory.
- [x] Use `crypto.randomUUID()`.
- [x] Default name: `Untitled UI Project`.
- [x] Default viewport: `390 x 844`.
- [x] Source type: `blank`.
- [x] Empty screens/components/tokens/changes.
- [x] Unit test factory.

### M1-05 Zustand project/editor state

- [x] Implement project state.
- [x] Implement viewport update.
- [x] Implement current screen/state placeholders.
- [x] Implement selected-element placeholder.
- [x] Keep API small and typed.
- [x] Test viewport changes.

### M1-06 Persistence

- [x] Add namespaced localStorage persistence.
- [x] Validate restored data with Zod.
- [x] Restore valid persisted project.
- [x] Fall back safely on invalid/corrupt data.
- [x] Do not crash on storage parse errors.
- [x] Unit test valid restore.
- [x] Unit test invalid restore.

### M1-07 Undo / Redo foundation

- [x] Implement history model/API.
- [x] Expose `undo`.
- [x] Expose `redo`.
- [x] Expose `canUndo`.
- [x] Expose `canRedo`.
- [x] Ensure one committed state change equals one history entry.
- [x] Test undo.
- [x] Test redo.
- [x] Test flags.
- [x] Document that pointer drag commits will be grouped in later milestones.

### M1-08 Editor shell

- [x] Create top toolbar.
- [x] Create left panel.
- [x] Create preview center.
- [x] Create right Inspector placeholder.
- [x] Create viewport frame.
- [x] Ensure editor fills available browser area.
- [x] Do not style it like HouseToDo.

### M1-09 Viewport selector

- [ ] Add presets:
  - [x] 375 x 667
  - [x] 375 x 812
  - [x] 390 x 844
  - [x] 393 x 852
  - [x] 430 x 932
- [x] Add Custom option or safe placeholder for custom values.
- [x] Update project/editor viewport state.
- [x] Preview frame reflects selected dimensions.
- [x] Add UI test.

### M1-10 Toolbar command placeholders

- [x] Project name display.
- [x] Undo button.
- [x] Redo button.
- [x] Import placeholder disabled or clearly marked unavailable.
- [x] Project Export placeholder disabled or clearly marked unavailable.
- [x] Codex Export placeholder disabled or clearly marked unavailable.
- [x] Do not implement later-milestone behavior.

### M1-11 Documentation

- [x] Add/update README.
- [x] Add `docs/ARCHITECTURE.md`.
- [x] Add `docs/PROJECT_FORMAT.md`.
- [x] Reference `UI_LAB_ADAPTER_SPEC_v1.md` as the external import contract.
- [x] Document Milestone 1 non-goals.

### M1-12 Final validation

- [x] Run lint.
- [x] Run typecheck.
- [x] Run unit/UI tests.
- [x] Run build.
- [x] Review changed files.
- [x] Confirm no HouseToDo mockup UI was introduced.
- [x] Confirm no react-moveable/JSZip/Codex Export implementation was introduced.
- [x] Record results in `.ai/MILESTONE.md`.

---

## Rules while implementing

After each small task:

1. run the most relevant test/check
2. perform a brief self-review
3. fix issues before moving on

At milestone end run the full quality gate.

Do not stop between small tasks unless:

- requirements conflict
- a destructive operation is required
- an architecture decision cannot be safely inferred
- an unexpected dependency/security issue materially changes the plan
