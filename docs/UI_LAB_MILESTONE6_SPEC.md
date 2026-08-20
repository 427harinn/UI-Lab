# UI Lab Milestone 6 — Codex Export

Milestone 6 adds `Export for Codex` to the existing trusted local mockup flow.
The feature produces a deterministic, implementation-oriented ZIP package and
does not import the package back into UI Lab.

## Boundary

```text
Import Mockup → Visual Editing → Export Project (.ui-project)
                                  └→ Export for Codex (implementation package)
```

Export requires an imported mockup, valid project and Adapter metadata, an
available iframe preview, and at least one UI change. No empty Codex package is
created.

## Screenshot policy

The current preview is rasterized locally with a browser-native SVG
`foreignObject` and Canvas boundary. The editor overlay is removed before
capture. Each changed screen/state is rendered and captured before the ZIP is
created. Any capture or PNG validation failure fails the complete export.
