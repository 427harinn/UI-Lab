# UI Lab

UI Lab is a browser-based visual UI editor. Milestone 4 adds Adapter-gated Inspector property editing on top of the trusted iframe preview introduced in Milestone 2 and the visual editing foundation from Milestone 3.

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

Moveable controls render inside the imported iframe document so all measurements use the preview content area's `(0, 0)` origin. Selection is reset when screen/state/import/iframe lifecycle changes. Project/Codex Export, source rewriting, and screenshot export remain future milestones. Inspector edits do not rewrite source CSS or React files.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/PROJECT_FORMAT.md](docs/PROJECT_FORMAT.md), and [.ai/MILESTONE.md](.ai/MILESTONE.md) for implementation details and status.
