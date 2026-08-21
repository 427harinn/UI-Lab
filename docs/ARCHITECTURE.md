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

## Milestone 4 Inspector architecture

`src/features/visual-editing/inspector.ts` owns the property model, validation, CSS parsing, and default classification. `position`, `width`, and `height` are `visual`; all supported style properties are `exact`. The Inspector renders fields only when the selected target's normalized Adapter `editableProperties` contains that property.

On target discovery, `Preview` reads `getComputedStyle()` for spacing, typography, color, background, border, radius, and opacity. The serializable `InspectorStyleSnapshot` is stored on selection for display and change-before values. Original inline declarations and baselines stay in iframe-local `WeakMap`s and are never persisted.

Inspector edits create the same `UiChange` records used by drag/resize, retaining both semantic `componentId` and instance `elementId`. Style edits apply to iframe inline styles only. The latest scoped change is resolved over the computed baseline and the original declaration is restored when an override is undone. Inputs commit on blur or Enter, so typing does not create per-key history entries; each committed field is one shared Undo/Redo transaction.

Screen/state changes, imports, undo/redo, and iframe reload clear selection. The next iframe load rediscovers Adapter targets, recaptures baselines, and reapplies all project changes.

## Milestone 5 project package architecture

`src/features/project/package.ts` is the serialization boundary for `.ui-project`. The archive has a package-level `formatVersion` in `project.json`, independent of the nested UI Lab project format and Adapter v1 format. Required entries are `project.json`, the five `adapter/*.json` documents, and `preview/index.html`. JSON is canonicalized with stable object-key ordering and fixed ZIP entry dates where JSZip permits it, while preserving project array semantics.

The package contains persistent state only: source metadata, viewport, normalized screens/states/components, tokens, changes, editor screen/state identity, Adapter metadata, and imported preview HTML. Transient selection snapshots, DOM nodes, iframe documents, WeakMaps, Moveable state, pointer interaction state, Blob URLs, and history stacks are excluded. Import clears selection and starts with empty `past`/`future` history.

Project restore follows this boundary:

```text
loadProjectPackage()
  -> detect package formatVersion
  -> migrateProjectPackageDocument() [v1 -> v1 today]
  -> validate project, Adapter entries, and preview
  -> return a complete in-memory project + ImportedMockup
  -> one atomic Zustand hydrate
  -> iframe Blob URL + route restore
  -> discover targets and reapply project changes
```

The loader is atomic at the store boundary: all asynchronous ZIP work happens before `currentProject`, `importedMockup`, viewport, or history are changed. Errors update only the readable toolbar error. The existing trusted local iframe security scope is retained; archived preview HTML is treated like imported mockup HTML and is not fetched remotely or executed in the parent.

For mockup projects, Import also cross-validates the normalized project against Adapter metadata: source identity, screen IDs/names/routes/default states, state IDs/names, component IDs/selectors/instances/editable properties, and tokens must agree. The current editor viewport is intentionally not compared with Adapter `defaultViewport`, because a user may change the editor viewport preset while preserving the source's original default viewport metadata.

localStorage remains a lightweight metadata convenience, not a binary project store. A reload may require selecting the `.ui-project` again, which is surfaced by the existing “Re-import required” state for mockup metadata without attempting to serialize preview HTML.

## Milestone 6 Codex Export boundary

`src/features/codex-export/export.ts` is a separate serialization boundary from
the `.ui-project` package. It consumes validated project changes and validated
Adapter metadata, resolves the final value for each screen/state/instance/
property scope, and emits only Codex-facing records. It never rewrites source,
calls a remote service, installs packages, or uploads local content.

`exact` values are normally implemented directly. `visual` values are
editor-space visual targets that must be reinterpreted within the existing
Flex/Grid/responsive layout. `target` values are approximate future-compatible
goals. `componentId` is the semantic implementation target and `instanceId` is
visual reference context; instance-specific code requires an explicit reason.

Before ZIP creation, stale screen/state/component/property targets are rejected,
zero-change projects are rejected, and all requested reference screenshots must
be valid PNGs. Screenshot generation is a browser-local boundary in
`src/features/codex-export/screenshot.ts`, registered by the iframe Preview.
The ZIP is created only after every screenshot succeeds.

JSON documents, screens, changes, components, and screenshot scope requests are
sorted deterministically. JSON uses stable object key ordering and ZIP entries
use fixed timestamps where JSZip permits it. `screens.json` is sourced from the
cross-validated Adapter metadata so Codex sees the screen route, states, and
default state that the preview actually supports.

## Deliberate boundaries

Adapter project files, iframe preview execution, visual editing, Inspector
changes, and Codex Export are local-only features. Source parsing/rewriting,
production application changes, package installation, remote upload, backend
services, and automatic PR work remain out of scope.

## Real-mockup acceptance boundary

Milestone 8 adds a pinned HouseToDo Adapter ZIP at
`e2e/fixtures/house-todo/HouseToDo-Mockup-uilab-v1.zip`. The fixture manifest
records the upstream repository, merge commit, artifact path, and expected
SHA256. Acceptance startup verifies that digest and stops with an explicit
fixture-changed error before importing anything when the bytes differ.

The acceptance helper reads `.uilab/project.json`, `screens.json`,
`components.json`, `states.json`, and `tokens.json` from that local ZIP with
JSZip. Screen, state, and component identity assertions are derived from
those documents at test runtime; no fixed screen count is a contract. The
synthetic M3–M7 tests remain the fast UI Lab feature-contract layer, while the
HouseToDo test owns real-mockup import, all-screen/state rendering and
discovery, representative editing, history, project round trip, and Codex
Export coverage.

## Milestone 7 quality boundaries

Keyboard handling is isolated in `src/features/editor/shortcuts.ts`. The shell
and each trusted same-origin Preview iframe register the same Undo, Redo, and
Escape handler. The Preview registers it on both its document and window during
iframe load and removes both listeners on reload/unmount; an already-consumed
event cannot run the action twice. The handler ignores input, textarea, select,
and contenteditable targets across iframe realms. Delete and Backspace have no
editor command. Inspector inputs own Enter/blur commit and Escape draft cancel,
so browser-native text undo is never combined with project history.

Import replacement is guarded at the Toolbar boundary when
`project.changes.length > 0`. The small application dialog has a heading,
`role="dialog"`, `aria-modal`, initial Cancel focus, a Continue action, Escape
close, and a minimal focus trap. Import validation remains atomic in the store;
Cancel does not call an import method.

The store exposes a short-lived status area separate from technical import
details. Success messages cover Mockup Import, Project Import, Project Export,
and Codex Export. Errors are categorized for users while the existing readable
validation message remains available as non-trace detail. Busy state disables
all import/export/history actions and prevents repeated Codex archive creation.

Preview owns the trusted same-origin iframe Blob URL and revokes it when the
source changes or the component unmounts. Toolbar download URLs are revoked in
`finally` blocks. Iframe click listeners and resize listeners are cleaned up;
DOM nodes and Blob URLs never enter project state.

The shell includes a `prefers-reduced-motion: reduce` rule for transitions,
animations, and scrolling. Moveable's iframe-local interaction is intentionally
left unchanged. Storybook stories live in `src/components/editor/` and isolate
the shell, Toolbar, empty/selected Inspector, status feedback, and guard dialog.
Playwright snapshots in `e2e/m7.quality.pw.ts-snapshots/` are regression
baselines; `docs/screenshots/m7/` is PR evidence and is not used as a baseline.

## Milestone 9 preview reliability and interaction UX

Preview target discovery is a lifecycle, not a one-time load callback. The
iframe `load` handler installs one `MutationObserver` on the trusted same-origin
document (`childList` + `subtree`), a `hashchange` listener on the iframe
window, and a coalescing `requestAnimationFrame` scheduler in
`src/features/visual-editing/discoveryLifecycle.ts`. Hash routes are also
resolved back to Adapter screen/state scope before rediscovery, so a native
preview route cannot leave the parent applying edits for the previous screen.
All rediscovery enters the
same `discoverEditableElements()` path. Observer callbacks do not discover
immediately, so a burst of async commits is one refresh and ordinary inline
style changes are not observed.

The overlay root, Moveable controls, manual resize handles, and editor style
node carry `data-uilab-editor-overlay`. Mutation records whose changes are
editor-owned are ignored, preventing editor UI from causing observer loops.
On every real refresh, `targetsRef`, React targets, and the iframe-local base
style/frame caches are updated. A selected `componentId` + `instanceId` is
re-resolved to the new DOM node when present; its frame/styles are read again.
When the identity is gone, selection is cleared and stale DOM is never passed
to Moveable.

Preview interaction mode is transient Editor UI state in Zustand and is not
part of project persistence, Project Export, or Codex Export. `Select` is the
default and captures Adapter target clicks for the existing Inspector and
Moveable workflow. `Interact` keeps the current Inspector selection visible but
does not prevent or stop preview events, and hides Moveable/manual resize
controls. Switching modes cancels active pointer interactions. The toolbar
toggle uses `aria-pressed`, visible focus, and keyboard-operable buttons.

Discovery, click/shortcut, hashchange, MutationObserver, RAF/timeout, and
resize/Moveable resources are disconnected on iframe reload, project
replacement, mode switch, and component unmount.
