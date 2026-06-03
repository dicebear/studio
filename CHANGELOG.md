# Changelog

All notable changes to the DiceBear Exporter for Figma will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
