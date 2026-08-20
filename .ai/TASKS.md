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

## Milestone 6 — Codex Export

Branch:

```text
feat/m6-codex-export
```

### M6-01 Export contract

- [x] Add independent Codex Export v1 schema and ZIP format.
- [x] Preserve semantic Adapter tokens and cross-validated screens/states.
- [x] Generate implementation and design Markdown documents.

### M6-02 Change resolution and validation

- [x] Resolve same screen/state/instance/property to one final state.
- [x] Stable-sort screen, state, component, instance, and property records.
- [x] Reject zero changes and stale screen/state/component/property targets.
- [x] Preserve exact, visual, and target value types.

### M6-03 Screenshots and UI

- [x] Add `Export for Codex` toolbar action distinct from Project Export.
- [x] Capture changed screen/state preview references locally as PNG.
- [x] Reject the complete export when screenshot generation fails.

### M6-04 Tests and evidence

- [x] Add schema, resolution, stale-target, token, Markdown, filename, ZIP, and screenshot-failure tests.
- [x] Add Mockup → edit → Export for Codex → ZIP inspection integration coverage.
- [x] Add Playwright E2E and `docs/screenshots/m6/` evidence.
- [x] Run lint, typecheck, unit/integration tests, build, and E2E.

### M6-05 Delivery

- [ ] Commit changes.
- [ ] Push `feat/m6-codex-export`.
- [ ] Create one non-draft PR targeting `main` without auto-merge.

---

## Milestone 3 — Visual Editing

Branch:

```text
feat/m3-visual-editing
```

### M3-01 Workflow and dependency

- [x] Update local `main`.
- [x] Create `feat/m3-visual-editing`.
- [x] Add `react-moveable`.

### M3-02 Discovery and selection

- [x] Discover only Adapter selector-matched DOM elements.
- [x] Require `data-uilab-component` and `data-uilab-id`.
- [x] Keep semantic component ID separate from rendered instance ID.
- [x] Select instances by iframe click.
- [x] Store selection IDs and serializable measurements, never DOM nodes.

### M3-03 Visual interaction

- [x] Render Moveable inside the iframe document.
- [x] Gate drag by `position`.
- [x] Gate resize by `width` / `height`.
- [x] Keep non-editable resize axes fixed.
- [x] Apply preview transforms and dimensions immediately.
- [x] Display X / Y / W / H in the Inspector placeholder.

### M3-04 Snap and guides

- [x] Enable viewport edge and center guidelines.
- [x] Use other editable elements as guide sources.
- [x] Display snap-active status during interaction.

### M3-05 History and lifecycle

- [x] Commit completed drag as one project history entry.
- [x] Commit completed resize as one project history entry.
- [x] Apply committed changes on undo and redo.
- [x] Reset selection on screen/state change and new import.
- [x] Re-discover targets after iframe reload.

### M3-06 Tests, documentation, and evidence

- [x] Add discovery, capability, coordinate, change, and history tests.
- [x] Add synthetic Adapter v1 Playwright coverage.
- [x] Capture selected, moved/resized, and snap/guide screenshots.
- [x] Document iframe, coordinate, target lifecycle, and history architecture.
- [x] Run lint, typecheck, tests, build, and E2E.

---

## Milestone 4 — Inspector

Branch:

```text
feat/m4-inspector
```

### M4-01 Inspector property model

- [x] Define supported properties and exact/visual value types.
- [x] Parse computed style values into serializable snapshots.
- [x] Validate numeric values and clamp opacity.

### M4-02 Adapter-gated editing

- [x] Render identity, screen/state, geometry, and editable property fields.
- [x] Hide properties that are not Adapter-editable.
- [x] Support position, size, spacing, typography, color/background, border/radius, and opacity.

### M4-03 Preview and history

- [x] Apply Inspector changes as preview-only inline style overrides.
- [x] Reapply project changes after iframe reload and selection lifecycle changes.
- [x] Commit on blur/Enter, not on every key.
- [x] Integrate exact/visual changes with shared Undo/Redo history.
- [x] Replace the latest same-scope property change for export-friendly final state resolution.

### M4-04 Tests, documentation, and evidence

- [x] Add model, parsing, validation, change resolution, and history tests.
- [x] Add synthetic Adapter UI integration and Playwright E2E coverage.
- [x] Capture Inspector overview, appearance, and geometry screenshots.
- [x] Update README, architecture, milestone status, and task status.

---

## Milestone 5 — Project Import / Export

Branch:

```text
feat/m5-project-import-export
```

### M5-01 Package format

- [x] Define independent package formatVersion 1.
- [x] Include project JSON, Adapter metadata, preview HTML, viewport, changes, and editor state.
- [x] Exclude binary/transient iframe and history state.

### M5-02 Export

- [x] Add Export Project toolbar command.
- [x] Use deterministic JSON ordering and safe filenames.
- [x] Preserve imported preview HTML without requiring the original mockup ZIP.

### M5-03 Import and validation

- [x] Add Import Project toolbar command distinct from Import Mockup.
- [x] Validate ZIP entries and all JSON documents with Zod.
- [x] Add migration entry point before current-schema validation.
- [x] Keep the open project unchanged after any import failure.
- [x] Restore preview, viewport, screen/state, and changes atomically.

### M5-04 Tests, documentation, and evidence

- [x] Add package, round-trip, error, migration, and atomicity tests.
- [x] Add Mockup → edit → Export → blank → Import integration coverage.
- [x] Add Playwright E2E and three M5 screenshots.
- [x] Update README, architecture, project format, milestone, and task docs.

---

## Implementation rule

After each small task:

1. run the most relevant test/check
2. perform a brief self-review
3. fix discovered issues before continuing

Do not stop for approval after every small task unless a material architectural or safety issue appears.
