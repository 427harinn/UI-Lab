# UI Lab Project Format

Milestone 5 defines `.ui-project`, the local ZIP archive used to save and resume a UI Lab editing session. It is separate from Codex Export, which remains a future change package.

## Archive layout

```text
HouseToDo.ui-project
├ project.json
├ adapter/
│  ├ project.json
│  ├ screens.json
│  ├ components.json
│  ├ tokens.json
│  └ states.json
└ preview/
   └ index.html
```

`project.json` contains the independent package `formatVersion` and the complete current project under `project`. The package version must not be confused with Adapter v1's `formatVersion` or the nested UI Lab project version. The nested project contains source metadata, viewport, screens/states, components, tokens, changes, and editor screen/state identity. Adapter metadata and imported preview HTML are stored separately so the original mockup ZIP is not required for restore.

`loadProjectPackage()` calls `migrateProjectPackageDocument()` before current-schema validation. Future package migrations belong at that boundary.

```ts
{
  formatVersion: 1,
  id: string,
  name: string,
  source: { type: 'blank' | 'mockup', name?: string },
  viewport: { width: number, height: number },
  screens: UiLabScreen[],
  components: UiLabComponentDefinition[],
  tokens: Record<string, unknown>,
  changes: UiChange[],
  editor: {
    currentScreenId?: string,
    currentStateId?: string,
    selectedElementId?: string,
  },
}
```

`UiChange.valueType` is one of `exact`, `target`, or `visual`. Change records are defined now so later visual editing can use the same model, but Milestone 1 creates no visual changes.

The storage key is `ui-lab:project:v1`. A saved value must pass the Zod project schema before it can be restored. localStorage contains only lightweight metadata; preview HTML, ZIP bytes, JSZip instances, Blob URLs, DOM nodes, Moveable state, and pointer interactions are never persisted. Browser reload can therefore still require selecting the `.ui-project` again.

Undo/Redo stacks are intentionally excluded from the archive. A successful Project Import restores the saved current project and starts with `past=[]` and `future=[]`; new edits create new history entries.

The future mockup source must follow the external `UI_LAB_ADAPTER_SPEC_v1.md` contract. This document does not redefine that contract.
