# UI Lab Project Format

Milestone 1 defines the validated in-memory and localStorage project shape. It is not yet a transport/archive format.

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

The storage key is `ui-lab:project:v1`. A saved value must pass the Zod project schema before it can be restored. ZIP import/export and format migration are intentionally deferred.

The future mockup source must follow the external `UI_LAB_ADAPTER_SPEC_v1.md` contract. This document does not redefine that contract.
