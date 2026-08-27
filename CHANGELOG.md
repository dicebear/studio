# Changelog

All notable changes to DiceBear Studio for Figma will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [39] - 2026-08-27

### Changed

- Rename the plugin from DiceBear Exporter to DiceBear Studio. With the import, the plugin works in both directions
  between Figma and definition files, so the old name no longer describes what it does.
- Show a welcome screen while nothing is selected. It explains how to start an export or an import, the previous
  behavior was a red error box.
- Reference `@dicebear/schema@1.5.1` in exported definition files (was `1.3.0`). It is the same schema version the
  import validates against.

### Added

- Import definition files. The Import button in the footer reads a 10.x definition JSON and rebuilds it in an empty
  Figma file: one component per variant, the palettes as local color styles linked to the matching layers, the avatar
  frame with its instances, and the group settings (probability, rotation, scale, translation, weights, tags) along with
  the license and creator metadata. An export from the imported file reproduces the definition, except for content Figma
  cannot represent. Such content, for example `<style>` elements with CSS animations, render-time variables, or
  per-reference colors, is skipped or approximated and listed as warnings after the import. Components without any
  visible content, such as the CSS animation components of the animated styles, are left out entirely.
- Validate definition files against the DiceBear definition schema before the import starts. Invalid files are rejected
  with a list of the schema violations instead of failing halfway through.
- Ignore background layers on export. When the background option names a color group, layers in the avatar frame that
  are bound to one of that group's color styles stay out of the export, DiceBear paints that background at render time.
  A style file can now show its avatar on a real background, and the import adds such a layer for styles with a
  `background` palette.
- Generate a file cover during the import. A new Thumbnail page holds a 1600x960 cover that follows the layout of the
  existing DiceBear style files: the style name and the DiceBear badge on the left, a staircase of sample avatars on the
  right. The sample avatars are rendered with `@dicebear/core`, so they show exactly what the style produces:
  probabilities, weights, and palette rules such as `notEqualTo` and `contrastTo` come from the real render pipeline.
  Tiles of styles without a `background` palette fall back to the brand color. The cover is registered as the file
  thumbnail, and the empty start page is removed.

### Fixed

- Strip the `fill-opacity` and `stroke-opacity` attributes Figma bakes into the SVG export when the bound color style
  has a paint opacity below 1. Palette values with an alpha channel, such as the `shade` palette of `cameo`, carry the
  alpha themselves, so the baked attribute applied it a second time in the exported definition.

## [38] - 2026-06-03

### Changed

- Reference `@dicebear/schema@1.1.0` in exported definition files (was `1.0.0`). The 1.1.0 schema adds an upper bound to
  the canvas and component dimensions and is otherwise backward compatible with existing definitions.

## [37] - 2026-06-03

### Fixed

- Preserve opacity and gradient stop offset precision in the SVG export. SVGO's `cleanupNumericValues` plugin rounds
  every numeric attribute to the configured precision, so exporting at precision `0` collapsed normalized 0..1 values
  (`opacity`, `fill-opacity`, `stroke-opacity`, `stop-opacity`, `flood-opacity`, `offset`) to `0` or `1` and made them
  useless. The exporter now uses a custom drop-in replacement that keeps these attributes at a usable minimum precision
  while still rounding all other values to the configured precision.

## [36] - 2026-05-26

### Fixed

- Stabilize filter-primitive identifiers in the SVG export. Figma appends its internal node ids to `result` / `in` /
  `in2` values on filter primitives (e.g. `effect1_foregroundBlur_2072_38`), which change between exports and produce
  noisy diffs in generated definition files. SVGO leaves these values alone because they are not `id` attributes. The
  exporter now renames every `result` to a deterministic, filter-scoped name (`r0`, `r1`, …) and rewrites the
  corresponding `in` / `in2` references. Standard inputs such as `SourceGraphic` and `SourceAlpha` are left untouched.
