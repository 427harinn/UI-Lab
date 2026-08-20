# Architecture

## Milestone 1 shape

The application is a Vite React + TypeScript SPA. `EditorShell` composes the toolbar, navigator, preview, and Inspector placeholder. The preview is a local smartphone viewport frame only; it does not execute or inspect an imported mockup.

Project and editor state live in a typed Zustand store at `src/features/project/store.ts`. The store keeps the current project, the active viewport and selection placeholders, plus a small snapshot history:

```text
past[] -> currentProject -> future[]
```

Each committed project mutation adds one snapshot to `past` and clears `future`. Undo and redo move complete snapshots between those arrays. A future pointer/resize implementation can build a draft during movement and call `commitProject` once on pointer release, producing one history entry.

Zod schemas in `src/schemas/project.ts` are the source of truth for persisted project data. `loadPersistedProject` parses JSON, validates the result, and returns a fresh blank project for malformed, invalid, or unavailable storage.

## Deliberate boundaries

The adapter contract remains external and is not loaded in Milestone 1. Adapter project files, iframe preview execution, element discovery, source parsing, visual manipulation, Inspector editing, export packaging, and backend services belong to later milestones.
