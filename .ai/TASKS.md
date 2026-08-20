# UI Lab Tasks

## Milestone 1 — Foundation

### M1-01 Project bootstrap

- [ ] Create React + Vite + TypeScript project.
- [ ] Configure strict TypeScript.
- [ ] Configure ESLint.
- [ ] Configure Vitest + Testing Library.
- [ ] Add `typecheck` script.
- [ ] Confirm initial lint/typecheck/test/build.

### M1-02 Base application structure

- [ ] Create `src/app`.
- [ ] Create `src/components/editor`.
- [ ] Create `src/components/panels`.
- [ ] Create `src/features/project`.
- [ ] Create `src/features/editor`.
- [ ] Create `src/features/adapter`.
- [ ] Create `src/features/export`.
- [ ] Create `src/schemas`.
- [ ] Create `src/types`.
- [ ] Keep unused future folders minimal; do not implement later milestones.

### M1-03 Core schemas

- [ ] Add `formatVersion: 1`.
- [ ] Define viewport schema.
- [ ] Define screen schema.
- [ ] Define component-definition schema.
- [ ] Define `exact | target | visual`.
- [ ] Define change schema.
- [ ] Define UI Lab project schema.
- [ ] Export inferred TypeScript types from Zod where practical.
- [ ] Test valid project.
- [ ] Test invalid format version.
- [ ] Test invalid viewport.

### M1-04 Blank project factory

- [ ] Add blank project factory.
- [ ] Use `crypto.randomUUID()`.
- [ ] Default name: `Untitled UI Project`.
- [ ] Default viewport: `390 x 844`.
- [ ] Source type: `blank`.
- [ ] Empty screens/components/tokens/changes.
- [ ] Unit test factory.

### M1-05 Zustand project/editor state

- [ ] Implement project state.
- [ ] Implement viewport update.
- [ ] Implement current screen/state placeholders.
- [ ] Implement selected-element placeholder.
- [ ] Keep API small and typed.
- [ ] Test viewport changes.

### M1-06 Persistence

- [ ] Add namespaced localStorage persistence.
- [ ] Validate restored data with Zod.
- [ ] Restore valid persisted project.
- [ ] Fall back safely on invalid/corrupt data.
- [ ] Do not crash on storage parse errors.
- [ ] Unit test valid restore.
- [ ] Unit test invalid restore.

### M1-07 Undo / Redo foundation

- [ ] Implement history model/API.
- [ ] Expose `undo`.
- [ ] Expose `redo`.
- [ ] Expose `canUndo`.
- [ ] Expose `canRedo`.
- [ ] Ensure one committed state change equals one history entry.
- [ ] Test undo.
- [ ] Test redo.
- [ ] Test flags.
- [ ] Document that pointer drag commits will be grouped in later milestones.

### M1-08 Editor shell

- [ ] Create top toolbar.
- [ ] Create left panel.
- [ ] Create preview center.
- [ ] Create right Inspector placeholder.
- [ ] Create viewport frame.
- [ ] Ensure editor fills available browser area.
- [ ] Do not style it like HouseToDo.

### M1-09 Viewport selector

- [ ] Add presets:
  - [ ] 375 x 667
  - [ ] 375 x 812
  - [ ] 390 x 844
  - [ ] 393 x 852
  - [ ] 430 x 932
- [ ] Add Custom option or safe placeholder for custom values.
- [ ] Update project/editor viewport state.
- [ ] Preview frame reflects selected dimensions.
- [ ] Add UI test.

### M1-10 Toolbar command placeholders

- [ ] Project name display.
- [ ] Undo button.
- [ ] Redo button.
- [ ] Import placeholder disabled or clearly marked unavailable.
- [ ] Project Export placeholder disabled or clearly marked unavailable.
- [ ] Codex Export placeholder disabled or clearly marked unavailable.
- [ ] Do not implement later-milestone behavior.

### M1-11 Documentation

- [ ] Add/update README.
- [ ] Add `docs/ARCHITECTURE.md`.
- [ ] Add `docs/PROJECT_FORMAT.md`.
- [ ] Reference `UI_LAB_ADAPTER_SPEC_v1.md` as the external import contract.
- [ ] Document Milestone 1 non-goals.

### M1-12 Final validation

- [ ] Run lint.
- [ ] Run typecheck.
- [ ] Run unit/UI tests.
- [ ] Run build.
- [ ] Review changed files.
- [ ] Confirm no HouseToDo mockup UI was introduced.
- [ ] Confirm no react-moveable/JSZip/Codex Export implementation was introduced.
- [ ] Record results in `.ai/MILESTONE.md`.

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
