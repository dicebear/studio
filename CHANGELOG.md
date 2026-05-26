# Changelog

All notable changes to the DiceBear Exporter for Figma will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [36] - 2026-05-26

### Fixed

- Stabilize filter-primitive identifiers in the SVG export. Figma appends its internal node ids to `result` / `in` /
  `in2` values on filter primitives (e.g. `effect1_foregroundBlur_2072_38`), which change between exports and produce
  noisy diffs in generated definition files. SVGO leaves these values alone because they are not `id` attributes. The
  exporter now renames every `result` to a deterministic, filter-scoped name (`r0`, `r1`, …) and rewrites the
  corresponding `in` / `in2` references. Standard inputs such as `SourceGraphic` and `SourceAlpha` are left untouched.
