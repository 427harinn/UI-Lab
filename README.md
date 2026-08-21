# UI Lab

UI Lab is a browser-based visual UI editor. Milestone 7 hardens the editor shell with safe shortcuts, editing feedback, guarded imports, accessibility, Storybook, and visual regression coverage.

## Development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run build-storybook
npm run test:e2e
```

Storybook:

```bash
npm run storybook
```

## Mockup import

Use the Import command to choose a local `.zip` containing the required Adapter v1 files:

```text
.uilab/project.json
.uilab/screens.json
.uilab/components.json
.uilab/tokens.json
.uilab/states.json
```

The preferred preview is a self-contained `project.entry` HTML file, commonly `dist/index.html`. UI Lab validates the package with Zod, reads it with JSZip, loads the HTML in a same-origin Blob URL iframe, and checks `contentDocument`/`contentWindow` access for Milestone 3. Imported preview HTML, ZIP bytes, JSZip instances, and Blob URLs are not persisted. After a browser reload, re-import the mockup; the persisted project metadata shows a “Re-import required” state instead of attempting to serialize binary data.

Imports are trusted local content. Remote URLs, backend execution, and arbitrary package installation are not supported.

The authoritative Adapter v1 contract is [UI_LAB_ADAPTER_SPEC_v1.md](UI_LAB_ADAPTER_SPEC_v1.md). The implementation keeps adapter-specific validation isolated in `src/schemas/adapter.ts` and normalizes the external object documents into the internal editor model only after validation.

Milestone 3 supports selecting Adapter-exposed instances, dragging elements whose Adapter allows `position`, resizing elements whose Adapter allows `width` and/or `height`, snapping to viewport/element guides, and reviewing X/Y/W/H in the Inspector. Milestone 4 adds Adapter-gated editing for position, dimensions, spacing, typography, color/background, border/radius, and opacity. Fields commit on blur or Enter, use computed style snapshots for initial values, and apply preview-only inline overrides. Both visual and exact changes use the existing undo/redo history and retain semantic component plus instance IDs.

Milestone 5 adds local project sessions. Use `Import Mockup` for an Adapter v1 `.zip`, `Export Project` to save the current editing state as a `.ui-project`, and `Import Project` to restore it later without the original mockup ZIP. The archive includes the current project JSON, Adapter metadata, preview HTML, viewport, and changes. Project import validates the complete ZIP before atomically replacing the open project; a failed import leaves the existing preview unchanged. Project archives intentionally do not include undo/redo stacks, DOM nodes, Blob URLs, or Moveable state, and browser reload may still require selecting the archive again.

The Milestone 6 workflow is:

```text
Import Mockup
  ↓
Visual Editing
  ↓
Export Project (.ui-project)
  ↓
Export for Codex (implementation ZIP)
```

`Export for Codex` generates `HouseToDo-ui-changes.zip` with normalized final
changes, semantic design tokens, Adapter screen metadata, implementation and
design instructions, and current preview screenshots. It is separate from
`.ui-project` and is not imported back into UI Lab. See
[docs/CODEX_EXPORT_FORMAT.md](docs/CODEX_EXPORT_FORMAT.md).

## Acceptance strategy

UI Lab keeps two complementary E2E layers: fast synthetic Adapter fixtures
cover the editor feature contracts, while the pinned
[HouseToDo real-mockup acceptance fixture](e2e/fixtures/house-todo/fixture.json)
covers the completed real Adapter through import, every metadata-derived
screen/state, discovery, editing, Undo/Redo, project round trip, and Codex
Export. The HouseToDo ZIP is stored in the repository and SHA-verified before
the acceptance test, so local and CI runs are offline and reproducible.

Moveable controls render inside the imported iframe document so all measurements use the preview content area's `(0, 0)` origin. Selection is reset when screen/state/import/iframe lifecycle changes. Codex Export, source rewriting, and screenshot export remain future milestones. Inspector edits do not rewrite source CSS or React files.

## Editing workflow and keyboard shortcuts

The primary workflow is `Import Mockup → Select → edit in Inspector or drag/resize → Export Project or Export for Codex`. UI changes are shown in the toolbar as a change count. Importing another mockup/project while changes exist opens a replacement confirmation dialog; Cancel leaves the current project untouched.

| Action | Windows/Linux | macOS |
| --- | --- | --- |
| Undo | Ctrl+Z | Cmd+Z |
| Redo | Ctrl+Shift+Z (Ctrl+Y also works) | Cmd+Shift+Z |
| Clear selection | Escape | Escape |
| Commit Inspector draft | Enter or blur | Enter or blur |
| Cancel Inspector draft | Escape | Escape |

Undo/redo shortcuts work while focus remains in the trusted Preview iframe and are ignored in input, textarea, select, and contenteditable controls, including controls belonging to the iframe document, so native text editing is preserved. Delete and Backspace never delete preview elements. Import/export controls show busy state, prevent repeated clicks, and announce success or user-readable errors through the status area.

Visual regression snapshots live under `e2e/m7.quality.pw.ts-snapshots/`; `docs/screenshots/m7/` contains PR evidence screenshots and is intentionally separate.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/PROJECT_FORMAT.md](docs/PROJECT_FORMAT.md), and [.ai/MILESTONE.md](.ai/MILESTONE.md) for implementation details and status.
