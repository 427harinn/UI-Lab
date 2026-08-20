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

- [ ] Update local `main`.
- [ ] Create `feat/m2-mockup-import`.
- [ ] Confirm implementation is not being performed directly on `main`.

### M2-02 Add dependency

- [ ] Add JSZip.
- [ ] Do not add react-moveable.
- [ ] Run install/typecheck.

### M2-03 Adapter schemas

- [ ] Add adapter project schema.
- [ ] Add screens schema.
- [ ] Add components schema.
- [ ] Add editable-property enum.
- [ ] Add `instances` enum.
- [ ] Add states schema.
- [ ] Add tokens schema.
- [ ] Add schema tests.

### M2-04 ZIP reader

- [ ] Accept a user-selected ZIP.
- [ ] Read ZIP using JSZip.
- [ ] Check required adapter files.
- [ ] Parse JSON safely.
- [ ] Validate parsed values.
- [ ] Validate `project.entry`.
- [ ] Confirm entry exists in ZIP.
- [ ] Return typed import result.
- [ ] Add invalid ZIP tests.
- [ ] Add missing-file tests.

### M2-05 Import UI

- [ ] Enable Import toolbar command.
- [ ] Add file input / picker flow.
- [ ] Restrict intent to ZIP.
- [ ] Add loading state.
- [ ] Prevent concurrent import.
- [ ] Add readable error presentation.
- [ ] Add trusted local import note.

### M2-06 Preview URL/document

- [ ] Read entry HTML as text.
- [ ] Create isolated iframe preview document URL.
- [ ] Clean up/revoke old URLs.
- [ ] Avoid running mockup code in parent context.
- [ ] Add documentation for preferred single-file import build.

### M2-07 iframe

- [ ] Add actual iframe to Preview area.
- [ ] Load imported preview.
- [ ] Detect load success/failure.
- [ ] Confirm parent can read `contentDocument`.
- [ ] Show clear error if DOM access is unavailable.
- [ ] Do not implement selection.

### M2-08 Route construction

- [ ] Add one route/hash builder utility.
- [ ] Implement `{entry}#{path}?uilabState={state}` semantics.
- [ ] Test Home-like route.
- [ ] Test state encoding.
- [ ] Avoid duplicated route-building logic.

### M2-09 Screen panel

- [ ] Populate screens from imported adapter.
- [ ] Select appropriate initial screen.
- [ ] Update current screen on click.
- [ ] On screen change, use screen default state.
- [ ] Update preview.

### M2-10 States panel

- [ ] Populate states for selected screen.
- [ ] Select adapter default state after screen change.
- [ ] Change state on click.
- [ ] Update preview route.

### M2-11 Viewport integration

- [ ] Apply adapter `defaultViewport` on import.
- [ ] Keep Milestone 1 viewport presets working.
- [ ] Verify viewport change does not re-import.

### M2-12 Store imported adapter data

- [ ] Store validated screens.
- [ ] Store validated states.
- [ ] Store validated components.
- [ ] Store validated tokens.
- [ ] Store source/project metadata.
- [ ] Do not store JSZip object.
- [ ] Do not persist Blob URL.

### M2-13 Persistence behavior

- [ ] Ensure existing project persistence remains safe.
- [ ] Do not write ZIP/binary data to localStorage.
- [ ] Define/document reload behavior.
- [ ] If re-import is required after reload, surface that cleanly.

### M2-14 Tests

- [ ] Valid adapter import.
- [ ] Invalid ZIP.
- [ ] Missing adapter file.
- [ ] Invalid JSON.
- [ ] Unsupported formatVersion.
- [ ] Invalid editable property.
- [ ] Missing entry.
- [ ] Screen population.
- [ ] State population.
- [ ] Screen switching.
- [ ] State switching.
- [ ] Default viewport applied.
- [ ] Visible import error.

### M2-15 Documentation

- [ ] Update README.
- [ ] Update `docs/ARCHITECTURE.md`.
- [ ] Document preview URL lifecycle.
- [ ] Document trusted local mockup security scope.
- [ ] Reference `UI_LAB_ADAPTER_SPEC_v1.md` as authoritative adapter contract.

### M2-16 Final validation

- [ ] Run lint.
- [ ] Run typecheck.
- [ ] Run full tests.
- [ ] Run build.
- [ ] Self-review diff.
- [ ] Confirm no react-moveable.
- [ ] Confirm no drag/resize.
- [ ] Confirm no Inspector editing.
- [ ] Confirm no Project ZIP Export.
- [ ] Confirm no Codex Export.
- [ ] Update `.ai/MILESTONE.md`.

### M2-17 Commit / Push / PR

- [ ] Commit Milestone 2 changes.
- [ ] Push `feat/m2-mockup-import`.
- [ ] Create Pull Request targeting `main`.
- [ ] PR body includes summary.
- [ ] PR body includes test results.
- [ ] PR body includes known limitations.
- [ ] PR explicitly confirms Milestone 3+ functionality is excluded.
- [ ] Do not merge automatically.

---

## Implementation rule

After each small task:

1. run the most relevant test/check
2. perform a brief self-review
3. fix discovered issues before continuing

Do not stop for approval after every small task unless a material architectural or safety issue appears.
