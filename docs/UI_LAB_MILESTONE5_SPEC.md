# UI Lab Milestone 5 — Project Import / Export

Milestone 5 saves and restores the current UI Lab editing session as a trusted local `.ui-project` ZIP. It does not generate Codex Export instructions, rewrite source code, or persist binary data to localStorage.

## Commands

- `Import Mockup` reads an Adapter v1 mockup ZIP.
- `Import Project` reads a `.ui-project` archive.
- `Export Project` writes the current project as `<safe-project-name>.ui-project`.

## Restore contract

The archive contains the current project JSON, Adapter metadata, preview HTML, and all serializable changes. Import validates every required entry and does not update the Zustand current project until ZIP parsing, JSON parsing, format detection, Adapter validation, project validation, and preview loading all succeed. Selection is cleared after a successful import. Undo/Redo history is reset.

For mockup projects, the loader additionally verifies that project and Adapter metadata agree on source identity, screens/routes/default states, state IDs/names, component selectors/instances/editable properties, and tokens. The editor's current viewport may differ from Adapter `defaultViewport` because viewport presets are editor state.

The preview HTML is loaded into the existing trusted same-origin iframe flow. Project changes are reapplied to discovered Adapter targets after iframe load. Remote fetch, package installation, source execution in the parent, and source rewriting remain unsupported.

## Validation errors

The importer distinguishes invalid ZIP, missing `project.json`, invalid JSON, unsupported package or Adapter formatVersion, missing Adapter data, missing preview, and schema mismatch. A failed import keeps the currently visible project and preview intact.
