# UI Lab Adapter Specification v1

This document is the authoritative external contract for trusted local mockup ZIPs imported by UI Lab.

## Package layout

```text
Mockup.zip
├─ dist/index.html
└─ .uilab/
   ├─ project.json
   ├─ screens.json
   ├─ components.json
   ├─ tokens.json
   └─ states.json
```

All five `.uilab` files are required. The preferred import build is a self-contained HTML file declared by `project.entry`.

## project.json

```json
{
  "formatVersion": 1,
  "name": "HouseToDo Mockup",
  "entry": "dist/index.html",
  "defaultViewport": {
    "width": 390,
    "height": 844
  }
}
```

`entry` is a relative path inside the ZIP. Adapter v1 uses hash-compatible navigation. UI Lab constructs routes as:

```text
{entry}#{path}?uilabState={state}
```

For example: `dist/index.html#/home?uilabState=overdue`.

## screens.json

Screens are an object keyed by screen ID:

```json
{
  "home": {
    "name": "Home",
    "path": "/home",
    "defaultState": "normal"
  }
}
```

## components.json

Components are an object keyed by semantic component ID. `selector` is required so UI Lab can discover the component in the imported iframe during later milestones.

```json
{
  "Home.TaskRow": {
    "selector": "[data-uilab-component='Home.TaskRow']",
    "instances": "multiple",
    "editable": ["width", "color", "background"]
  }
}
```

`instances` is either `single` or `multiple`.

Allowed `editable` properties are:

```text
position, width, height, padding, margin, gap,
fontSize, fontWeight, lineHeight, color, background,
border, borderRadius, opacity
```

## states.json

States are grouped by screen ID and keyed by state ID:

```json
{
  "home": {
    "normal": { "name": "Normal" },
    "overdue": { "name": "Overdue" }
  }
}
```

UI Lab only presents states declared for the selected screen. A screen change selects that screen's `defaultState`.

## tokens.json

Tokens are a JSON object owned by the adapter:

```json
{
  "color": {
    "accent": "#2f6fed"
  },
  "spacing": {
    "sm": "8px"
  }
}
```

Token values are validated as JSON values and stored for future milestones. Milestone 2 does not edit them.

## DOM identity

Rendered component roots should expose semantic identity with `data-uilab-component` and instance identity with `data-uilab-id`. UI Lab loads the built preview in an iframe and must retain access to its `contentDocument` and `contentWindow`.

Adapter v1 imports are trusted local content only. Remote URLs, backend execution, source parsing, and source rewriting are outside this contract.
