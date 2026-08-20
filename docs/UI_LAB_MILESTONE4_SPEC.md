# UI Lab Milestone 4 — Inspector

Milestone 4 lets a selected Adapter instance be edited from the right Inspector without rewriting the imported source.

## Supported properties

The Inspector supports `position`, `width`, `height`, `padding`, `margin`, `gap`, `fontSize`, `fontWeight`, `lineHeight`, `color`, `background`, `border`, `borderRadius`, and `opacity`. A field is rendered only when the selected Adapter component declares that property in `editable`.

`position`, `width`, and `height` use `valueType: visual`. All other Milestone 4 properties use `valueType: exact`. Position is stored as `{ x, y }`; spacing uses one numeric pixel value in v1.

## Commit and preview behavior

Numeric and text inputs commit on blur or Enter. A commit produces one shared `UiChange` history transaction. Changes apply to the selected instance's iframe inline style or visual frame and are reapplied from `currentProject.changes` after Undo, Redo, screen/state changes, and iframe reload. The original imported source remains untouched.

Computed values come from `getComputedStyle()` when the target is discovered. Only the serializable Inspector snapshot is stored on selection; transient baseline inline declarations remain in iframe-local `WeakMap`s.

## Validation

NaN is rejected, width/height must be positive, font size must be at least 1, radius and spacing cannot be negative, and opacity is clamped to 0–1. CSS text values are checked through a scratch `CSSStyleDeclaration` before committing.

