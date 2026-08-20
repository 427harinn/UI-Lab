# UI Lab

UI Lab is a browser-based visual UI editor. Milestone 1 provides the stable editor foundation: a neutral three-pane shell, viewport presets, a validated blank project model, local persistence, and undo/redo state.

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

## Milestone 1 boundaries

The current milestone intentionally contains no HouseToDo mockup screens, mockup ZIP import, iframe execution, visual element manipulation, Inspector editing, project ZIP export, screenshot export, or Codex Export. The future imported-mockup contract is `UI_LAB_ADAPTER_SPEC_v1.md`; it is external to this foundation.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/PROJECT_FORMAT.md](docs/PROJECT_FORMAT.md), and [.ai/MILESTONE.md](.ai/MILESTONE.md) for implementation details and status.
