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

## Milestone 3 visual editing architecture

### iframe selection and target lifecycle

`Preview` retains the iframe element and reads its same-origin `contentDocument` after every load. `discoverEditableElements` iterates the normalized Adapter component definitions and calls each declared `selector`; a match is editable only when it is an `HTMLElement` with the matching `data-uilab-component` and a non-empty `data-uilab-id`. Unlisted DOM is never promoted to an editing target. The semantic component ID comes from the Adapter definition, while the instance ID comes from `data-uilab-id`.

Selection state contains only the component ID, instance ID, editable properties, and serializable measurements. It never stores an iframe DOM node. A screen/state change, new import, undo/redo, or iframe load clears selection. The next iframe load creates a fresh overlay root and re-runs Adapter discovery against the new document.

### Moveable placement and coordinates

The Moveable React component is rendered through a React portal into an overlay root appended to the iframe document body. Its `target`, `container`, and `rootContainer` therefore share the iframe document's coordinate space. This avoids mixing the parent document's iframe offset with target `getBoundingClientRect()` values. The overlay root is fixed to the iframe content area and is recreated with the iframe document. Resize directions are mirrored by a small iframe-local pointer handle layer so resizing remains reliable across iframe pointer lifecycles; it uses the same Moveable-aligned frame and history path. North/west handles are exposed only when `position` is editable, while position-locked targets can resize only from their east/south edges.

All measurements use the iframe preview content area as origin `(0, 0)`. A normalized frame is `getBoundingClientRect()` plus the iframe document's scroll offset; the parent iframe element's position is intentionally never included. Viewport edges, viewport center lines, and other discovered editable elements are passed to Moveable as snap guide sources.

### Temporary visual changes and history

The editor captures each target's initial inline transform, width, and height in `data-uilab-*` attributes on the transient iframe DOM. Drag applies a translate delta; resize applies width/height inline styles and, for position-editable targets, the corresponding north/west x/y delta. Each completed interaction is committed as one history transaction, so a north/west resize can be undone and redone with its dimensions and position together. These are preview-only adjustments and do not rewrite imported source or CSS.

Completed operations append Adapter-scoped `UiChange` records: drag uses one `position` record, while resize uses at most one `position`, one `width`, and one `height` record. The store commits the entire operation once on pointer release, so pointer-move events do not create history entries. Undo/redo swaps the project snapshot and `Preview` re-applies the resolved changes to the current iframe target using its captured baseline frame.

## Deliberate boundaries

Adapter project files and iframe preview execution are implemented for Milestone 2. Milestone 3 adds element discovery, selection, visual manipulation, snapping, guides, measurements, and screenshot evidence. Source parsing, Inspector styling/property editing, export packaging, screenshot export, and backend services remain out of scope.
