# Codex Implementation Instruction — UI Lab Milestone 2

Implement **Milestone 2 — Mockup Import**.

## Git workflow — mandatory

Do not implement directly on `main`.

Before changing code:

```bash
git checkout main
git pull
git checkout -b feat/m2-mockup-import
```

Equivalent safe commands are acceptable if the branch already exists.

At completion:

1. commit the changes
2. push `feat/m2-mockup-import`
3. create a Pull Request targeting `main`
4. do not merge the PR automatically

If GitHub CLI is available and authenticated, use it to create the PR.
If it is not available/authenticated, stop after push and report the exact manual PR step required.

## Read first

Read:

- `UI_LAB_ADAPTER_SPEC_v1.md`
- `UI_LAB_REQUIREMENTS_v1.md`
- `UI_LAB_MILESTONE2_SPEC.md`
- `.ai/MILESTONE.md`
- `.ai/TASKS.md`

Treat `UI_LAB_ADAPTER_SPEC_v1.md` as the authoritative external mockup contract.

## Context

Milestone 1 is complete.

Reported current quality gate:

- lint passed
- typecheck passed
- 5 test files / 14 tests passed
- build passed

Known non-blocking issue:

- jsdom emits Node engine warnings on Node 22.18.0

Do not spend Milestone 2 changing unrelated dependency versions unless the warning becomes a real blocker.

## Goal

Allow a user to import a trusted adapter-compatible mockup ZIP and:

- validate it
- load its built preview
- render the preview inside UI Lab
- list adapter screens
- list mock states
- switch screens/states
- apply the mockup default viewport
- preserve iframe DOM accessibility for Milestone 3

## Required dependency

Add:

- JSZip

Do not add:

- react-moveable

## Required adapter files

Require:

```text
.uilab/project.json
.uilab/screens.json
.uilab/components.json
.uilab/tokens.json
.uilab/states.json
```

Validate them using Zod.

Validate that `project.entry` exists inside the ZIP.

## Preview

Support Adapter v1's preferred single-file Import build first.

Expected common entry:

```text
dist/index.html
```

Read the entry HTML and load it in an iframe using a browser-local preview strategy appropriate for trusted imported content.

The imported preview must not execute in the parent React application context.

Manage generated preview/Object URLs carefully and release stale URLs.

## Critical Milestone 3 prerequisite

After iframe load, verify UI Lab can access the preview DOM through `contentDocument`/`contentWindow`.

If DOM inspection is unavailable, show a clear error.

Do not implement editable-element selection yet.

## Routing

Use one tested route builder for Adapter v1:

```text
{entry}#{path}?uilabState={state}
```

Semantically support:

```text
#/home?uilabState=normal
#/home?uilabState=overdue
```

Do not introduce BrowserRouter/server-fallback assumptions.

## Screens / States

On successful import:

- populate Screens panel
- choose an initial screen
- use its `defaultState`
- populate States panel for current screen
- changing screen updates preview
- changing state updates preview
- changing screen resets state to the new screen's defaultState

Only show states declared by adapter.

## Viewport

On import:

- apply adapter `defaultViewport`

Keep the Milestone 1 preset selector working normally.

## Components / Tokens

Read, validate, and store them now.

Do not edit them yet.

## Error handling

Provide readable errors for at least:

- invalid ZIP
- missing required adapter file
- invalid JSON
- invalid schema
- unsupported formatVersion
- missing entry
- entry path missing from ZIP
- iframe load failure
- DOM inspection unavailable

Do not expose raw stack traces as the primary user-facing error.

## Persistence

Do not persist:

- raw ZIP binary
- JSZip objects
- Blob/Object URLs

If imported previews require re-import after a browser reload in Milestone 2, document and surface that limitation clearly.

Do not build `.ui-project` persistence yet.

## Tests

At minimum add coverage for:

- valid adapter import
- invalid ZIP
- missing adapter file
- invalid formatVersion
- invalid editable key
- missing entry
- route construction
- default state resolution
- screen population
- state population
- screen switching
- state switching
- default viewport application
- visible import error

Use synthetic/minimal test fixtures.

Do not depend on the HouseToDo mockup project.

## Explicit non-goals

Do not implement:

- react-moveable
- editable element selection
- drag
- resize
- snap
- guides
- Inspector editing
- CSS override editing
- `.ui-project` ZIP import/export
- Codex Export
- screenshot export
- React/CSS source parsing
- source rewriting
- backend

## Development flow

Work continuously through `.ai/TASKS.md`.

After each logical small task:

1. run relevant tests/checks
2. brief self-review
3. fix issues before continuing

Do not stop after every task for approval.

Stop only for a material architecture/security/destructive-operation issue.

## Final quality gate

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Pull Request

Create a PR from:

```text
feat/m2-mockup-import
```

to:

```text
main
```

Suggested title:

```text
feat: add mockup import and preview
```

PR description must contain:

### Summary

What was implemented.

### Adapter support

Which Adapter v1 features are supported.

### Tests

Exact lint/typecheck/test/build results.

### Known limitations

Especially persistence/re-import behavior if applicable.

### Explicit exclusions

Confirm:

- no react-moveable
- no drag/resize
- no Inspector editing
- no Project ZIP Export
- no Codex Export

Do not merge the PR.

## Final report

Report:

1. branch name
2. major files changed
3. import architecture
4. iframe/DOM-access approach
5. test count/results
6. lint result
7. typecheck result
8. build result
9. known limitations
10. PR URL, if created
11. confirmation that the PR was not merged
