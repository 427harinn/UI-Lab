# UI Lab

UI Lab is a browser-based visual UI editor. Milestone 2 adds trusted Adapter v1 mockup ZIP import, validated screen/state metadata, and an isolated iframe preview on top of the Milestone 1 foundation.

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

The authoritative `UI_LAB_ADAPTER_SPEC_v1.md` is an external contract and is not included in this checkout. The implementation follows the Adapter v1 contract restated in [docs/UI_LAB_MILESTONE2_SPEC.md](docs/UI_LAB_MILESTONE2_SPEC.md) and keeps adapter-specific validation isolated in `src/schemas/adapter.ts`.

Milestone 2 intentionally contains no visual element selection, drag, resize, snapping, guides, Inspector editing, project ZIP export, screenshot export, or Codex Export.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/PROJECT_FORMAT.md](docs/PROJECT_FORMAT.md), and [.ai/MILESTONE.md](.ai/MILESTONE.md) for implementation details and status.
