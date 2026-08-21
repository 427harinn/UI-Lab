# Codex Export Format v1

Codex Export is a local implementation package, separate from `.ui-project`.
`.ui-project` saves and restores UI Lab editing sessions; Codex Export describes
the final visual changes for implementation in a real application.

## Required archive entries

```text
HouseToDo-ui-changes.zip
├ ui-changes.json
├ design-tokens.json
├ screens.json
├ IMPLEMENTATION.md
├ DESIGN.md
└ screenshots/
   └ <screenId>-<stateId>.png
```

`manifest.json` is also included and declares `formatVersion: 1` and the
required entries.

## ui-changes.json

```json
{
  "formatVersion": 1,
  "project": "HouseToDo",
  "changes": [
    {
      "screenId": "home",
      "stateId": "normal",
      "componentId": "Home.TaskRow",
      "instanceId": "task-bird",
      "property": "fontSize",
      "before": 16,
      "after": 20,
      "valueType": "exact"
    }
  ]
}
```

Records are resolved to one final value for each `screenId`, `stateId`,
`instanceId`, and `property`. They are sorted by screen, state, component,
instance, and property. Internal IDs and timestamps are omitted.

`exact` is an implementation value and should normally be used directly.
`visual` is a visual target: preserve the existing layout and re-interpret it
to achieve the same result. `target` is a future-compatible approximate goal.

`componentId` is the primary semantic implementation target. `instanceId` is a
visual reference; an instance-specific override requires an explicit reason.

M10 component-wide records may additionally include:

```json
{
  "scope": "component",
  "referenceInstanceId": "day-1",
  "componentId": "Calendar.DayCell",
  "property": "height",
  "before": 56,
  "after": 68,
  "valueType": "visual"
}
```

`scope` omitted means `instance` for v1 compatibility. A component-scoped
record is shared semantic implementation intent for the specified screen/state;
consumers should not materialize it as unrelated one-off instance overrides.

## Other files

- `design-tokens.json` preserves the Adapter's semantic token object and does not include editor transient values.
- `screens.json` lists screen name, route, states, and default state from validated Adapter metadata.
- `IMPLEMENTATION.md` explains safe source-level implementation rules.
- `DESIGN.md` describes the visual intent and context.
- `screenshots/` contains PNG references for every changed screen/state.

## Validation and security

UI Lab validates the project, Adapter target screen/state/component/property,
change value type, token object, screens object, and screenshot PNG signature
before creating the ZIP. A stale target or zero-change project is rejected. For
each rendered screen/state, changed semantic component + instance pairs are
checked against the discovered iframe targets when available.
Screenshot failure rejects the entire export; no partial ZIP is downloaded.
The implementation performs local browser processing only: it does not upload
data, call a remote API, install packages, execute arbitrary source, or rewrite
production source code.
