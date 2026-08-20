# UI Lab Tasks

## Milestone 1 — Foundation

Status: COMPLETE

Quality gate reported:

- lint: passed
- typecheck: passed
- tests: 5 files / 14 tests passed
- build: passed

Known non-blocking issue:

- Node 22.18.0 reports jsdom engine warnings

---

## Milestone 2 — Mockup Import

Branch:

```text
feat/m2-mockup-import
```

### M2-01 Git workflow

- [x] Update local `main`.
- [x] Create `feat/m2-mockup-import`.
- [x] Confirm implementation is not being performed directly on `main`.

### M2-02 Add dependency

- [x] Add JSZip.
- [x] Do not add react-moveable.
- [x] Run install/typecheck.

### M2-03 Adapter schemas

- [x] Add adapter project schema.
- [x] Add screens schema.
- [x] Add components schema.
- [x] Add editable-property enum.
- [x] Add `instances` enum.
- [x] Add states schema.
- [x] Add tokens schema.
- [x] Add schema tests.

### M2-04 ZIP reader

- [x] Accept a user-selected ZIP.
- [x] Read ZIP using JSZip.
- [x] Check required adapter files.
- [x] Parse JSON safely.
- [x] Validate parsed values.
- [x] Validate `project.entry`.
- [x] Confirm entry exists in ZIP.
- [x] Return typed import result.
- [x] Add invalid ZIP tests.
- [x] Add missing-file tests.

### M2-05 Import UI

- [x] Enable Import toolbar command.
- [x] Add file input / picker flow.
- [x] Restrict intent to ZIP.
- [x] Add loading state.
- [x] Prevent concurrent import.
- [x] Add readable error presentation.
- [x] Add trusted local import note.

### M2-06 Preview URL/document

- [x] Read entry HTML as text.
- [x] Create isolated iframe preview document URL.
- [x] Clean up/revoke old URLs.
- [x] Avoid running mockup code in parent context.
- [x] Add documentation for preferred single-file import build.

### M2-07 iframe

- [x] Add actual iframe to Preview area.
- [x] Load imported preview.
- [x] Detect load success/failure.
- [x] Confirm parent can read `contentDocument`.
- [x] Show clear error if DOM access is unavailable.
- [x] Do not implement selection.

### M2-08 Route construction

- [x] Add one route/hash builder utility.
- [x] Implement `{entry}#{path}?uilabState={state}` semantics.
- [x] Test Home-like route.
- [x] Test state encoding.
- [x] Avoid duplicated route-building logic.

### M2-09 Screen panel

- [x] Populate screens from imported adapter.
- [x] Select appropriate initial screen.
- [x] Update current screen on click.
- [x] On screen change, use screen default state.
- [x] Update preview.

### M2-10 States panel

- [x] Populate states for selected screen.
- [x] Select adapter default state after screen change.
- [x] Change state on click.
- [x] Update preview route.

### M2-11 Viewport integration

- [x] Apply adapter `defaultViewport` on import.
- [x] Keep Milestone 1 viewport presets working.
- [x] Verify viewport change does not re-import.

### M2-12 Store imported adapter data

- [x] Store validated screens.
- [x] Store validated states.
- [x] Store validated components.
- [x] Store validated tokens.
- [x] Store source/project metadata.
- [x] Do not store JSZip object.
- [x] Do not persist Blob URL.

### M2-13 Persistence behavior

- [x] Ensure existing project persistence remains safe.
- [x] Do not write ZIP/binary data to localStorage.
- [x] Define/document reload behavior.
- [x] If re-import is required after reload, surface that cleanly.

### M2-14 Tests

- [x] Valid adapter import.
- [x] Invalid ZIP.
- [x] Missing adapter file.
- [x] Invalid JSON.
- [x] Unsupported formatVersion.
- [x] Invalid editable property.
- [x] Missing entry.
- [x] Screen population.
- [x] State population.
- [x] Screen switching.
- [x] State switching.
- [x] Default viewport applied.
- [x] Visible import error.

### M2-15 Documentation

- [x] Update README.
- [x] Update `docs/ARCHITECTURE.md`.
- [x] Document preview URL lifecycle.
- [x] Document trusted local mockup security scope.
- [x] Reference `UI_LAB_ADAPTER_SPEC_v1.md` as authoritative adapter contract.

### M2-16 Final validation

- [x] Run lint.
- [x] Run typecheck.
- [x] Run full tests.
- [x] Run build.
- [x] Self-review diff.
- [x] Confirm no react-moveable.
- [x] Confirm no drag/resize.
- [x] Confirm no Inspector editing.
- [x] Confirm no Project ZIP Export.
- [x] Confirm no Codex Export.
- [x] Update `.ai/MILESTONE.md`.

### M2-17 Commit / Push / PR

- [x] Commit Milestone 2 changes.
- [x] Push `feat/m2-mockup-import`.
- [ ] Create Pull Request targeting `main`.
- [ ] PR body includes summary.
- [ ] PR body includes test results.
- [ ] PR body includes known limitations.
- [ ] PR explicitly confirms Milestone 3+ functionality is excluded.
- [ ] Do not merge automatically.

PR creation remains manual because the local GitHub CLI token is invalid. Use the branch PR link after pushing, target `main`, and include the required summary, Adapter support, tests, known limitations, and explicit exclusions sections.

---

## Implementation rule

After each small task:

1. run the most relevant test/check
2. perform a brief self-review
3. fix discovered issues before continuing

Do not stop for approval after every small task unless a material architectural or safety issue appears.
