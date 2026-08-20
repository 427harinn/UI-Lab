# Codex Implementation Instruction — UI Lab Milestone 1

Implement **Milestone 1 — Foundation** for the UI Lab project.

## Context

UI Lab will eventually:

1. import adapter-compatible frontend mockups
2. let the user visually select/move/resize/style editable elements
3. save the UI Lab editing project
4. export change specifications and screenshots for Codex
5. let Codex apply those changes to the real production project

Milestone 1 must build only the stable application foundation.

The external mockup contract is defined by:

- `UI_LAB_ADAPTER_SPEC_v1.md`

Internal requirements are defined by:

- `UI_LAB_REQUIREMENTS_v1.md`
- `.ai/MILESTONE.md`
- `.ai/TASKS.md`

Read all of them before implementation.

## Critical scope rule

Do **not** implement HouseToDo mockup UI.

Do **not** implement features assigned to later milestones.

Specifically, do not add:

- Mockup ZIP import
- JSZip
- iframe mockup execution
- react-moveable
- drag/resize
- snap/guides
- Inspector property editing
- `.ui-project` ZIP import/export
- Codex export generation
- screenshot export
- Storybook
- backend/API/authentication
- React/CSS source parsing
- production-code rewriting

Placeholders for later commands are allowed in the shell, but they must not perform those features.

## Required implementation

### 1. Project foundation

Use:

- React
- Vite
- TypeScript
- Zustand
- Zod
- Vitest
- Testing Library

Provide scripts equivalent to:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Use strict TypeScript.

### 2. Editor shell

Build a functional three-pane editor shell:

- top toolbar
- left Screens/States area
- central Preview area
- right Inspector placeholder

The center must contain a smartphone viewport frame.

This is an internal development tool, not HouseToDo itself. Keep the UI neutral and usable rather than spending time on consumer visual polish.

### 3. Viewport

Support presets:

- 375 x 667
- 375 x 812
- 390 x 844
- 393 x 852
- 430 x 932

Default:

- 390 x 844

Changing the preset must update application state and visibly update the preview frame.

### 4. Schemas

Use Zod to define and validate at least:

- viewport
- screens
- component definitions
- `ChangeValueType = exact | target | visual`
- UI changes
- UI Lab project

The project schema must use:

```ts
formatVersion: 1
```

Add independent schema tests.

### 5. Blank project

Provide a blank project factory with:

```text
name: Untitled UI Project
source.type: blank
viewport: 390 x 844
screens: []
components: []
tokens: {}
changes: []
```

Generate project ID with `crypto.randomUUID()`.

### 6. Zustand

Provide typed state/actions for:

- current project
- viewport
- current screen placeholder
- current state placeholder
- selected element placeholder

Avoid unnecessary abstraction.

### 7. Persistence

Persist the current project in localStorage.

On load:

1. read persisted value
2. parse safely
3. validate with Zod
4. restore if valid
5. otherwise create/fall back to a blank project

Invalid persistence must never crash the application.

Add tests.

### 8. Undo / Redo

Implement the foundation now.

Required API:

```ts
undo()
redo()
canUndo
canRedo
```

Test:

- state commit
- undo
- redo
- flag states

Design the API so future drag/resize operations can commit only once on pointer release.

Do not implement pointer interactions now.

### 9. Toolbar

Show:

- project name
- viewport selector
- Undo
- Redo
- Import placeholder
- Project Export placeholder
- Codex Export placeholder

Later-milestone commands must be disabled or clearly unavailable.

### 10. Documentation

Create/update:

```text
README.md
docs/ARCHITECTURE.md
docs/PROJECT_FORMAT.md
.ai/MILESTONE.md
.ai/TASKS.md
```

Do not rewrite the agreed requirements into a conflicting architecture.

`UI_LAB_ADAPTER_SPEC_v1.md` remains the external mockup contract.

## Tests

At minimum cover:

- blank project factory
- valid project schema
- invalid format version
- invalid viewport
- viewport state update
- valid persisted project restore
- corrupt persisted project fallback
- undo
- redo
- canUndo/canRedo
- editor shell render
- viewport selector behavior

## Development flow

Work through the Milestone 1 tasks continuously.

After each small task:

1. run the most relevant tests/check
2. briefly self-review
3. fix problems before continuing

Do not pause after every small task for approval.

Stop only if:

- requirements materially conflict
- a destructive operation is needed
- a major architecture decision cannot be inferred safely
- a dependency/security issue materially changes the plan

## Final quality gate

Before reporting completion, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Report:

1. major files added/changed
2. architecture implemented
3. test counts/results
4. lint result
5. typecheck result
6. build result
7. any known limitations
8. confirmation that later-milestone functionality was not implemented

Also confirm explicitly:

- no HouseToDo mockup screens were added
- no Mockup Import was implemented
- no react-moveable was added
- no Codex Export was implemented
