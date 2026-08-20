# Architecture

## Editor shape

The application is a Vite React + TypeScript SPA. `EditorShell` composes the toolbar, navigator, preview, and Inspector placeholder. The preview is a local smartphone viewport frame that can host a trusted imported mockup without executing it in the parent React document.

Project and editor state live in a typed Zustand store at `src/features/project/store.ts`. The store keeps the current project, the active viewport and selection placeholders, plus a small snapshot history:

```text
past[] -> currentProject -> future[]
```

Each committed project mutation adds one snapshot to `past` and clears `future`. Undo and redo move complete snapshots between those arrays. A future pointer/resize implementation can build a draft during movement and call `commitProject` once on pointer release, producing one history entry.

Zod schemas in `src/schemas/project.ts` are the source of truth for persisted project data. `loadPersistedProject` parses JSON, validates the result, and returns a fresh blank project for malformed, invalid, or unavailable storage.

## Mockup import architecture

`UI_LAB_ADAPTER_SPEC_v1.md` is the authoritative external contract. `src/schemas/adapter.ts` defines its strict Adapter v1 documents and the normalized `ImportedMockup` model. `src/features/mockup/importer.ts` reads the five required `.uilab` files with JSZip, maps each parse failure to a readable `MockupImportError`, validates `project.entry`, normalizes the external object documents, and reads the preferred single-file HTML entry. `src/features/mockup/route.ts` is the only route builder and produces `{entry}#{path}?uilabState={state}`.

The Zustand store keeps validated adapter data and preview HTML in memory only. It maps screens, states, components, tokens, source metadata, and the adapter viewport into the existing `UiLabProject` shape. Screen changes resolve the new screen's `defaultState`; state changes are restricted by the navigator to states declared for the selected screen.

`Preview` creates one Blob URL for the imported HTML and appends the route hash to that URL. It revokes the URL during replacement or unmount. The iframe is intentionally not sandboxed because Milestone 3 requires same-origin `contentDocument`/`contentWindow` access; the UI labels the feature as trusted local import. A browser without `URL.createObjectURL` uses `srcDoc` as a local test/fallback path. The parent only inspects iframe readiness and does not parse or rewrite imported source.

Only project metadata is persisted. Raw ZIP bytes, JSZip objects, preview HTML, and Blob URLs never enter localStorage. A reload therefore requires re-importing the mockup; persisted mockup metadata is surfaced as “Re-import required”.

## Deliberate boundaries

Adapter project files and iframe preview execution are implemented for Milestone 2. Element discovery/selection, source parsing, visual manipulation, Inspector editing, export packaging, screenshots, and backend services remain out of scope.
