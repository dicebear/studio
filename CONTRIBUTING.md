# Contributing

Thanks for taking the time to contribute to DiceBear Studio, the DiceBear plugin for Figma.

## Before you start

- Bugs and small fixes: open a pull request directly.
- Larger changes (new settings, changes to the export format, UI rewrites): please open an issue first so we can agree
  on the approach before you spend time on it.
- Security issues: do **not** open a public issue. Email <contact@dicebear.com> instead; see the
  [DiceBear security policy](https://github.com/dicebear/.github/blob/main/SECURITY.md).
- All contributors are expected to follow the
  [DiceBear Code of Conduct](https://github.com/dicebear/.github/blob/main/CODE_OF_CONDUCT.md).

## Requirements

- [Node.js](https://nodejs.org/) 20.19 or newer
- The [Figma desktop app](https://www.figma.com/downloads/) (required to load local plugins)

## Local setup

```sh
git clone https://github.com/dicebear/studio.git
cd studio
npm install
```

## Load the plugin in Figma

1. Run `npm run build` once so that `dist/` exists.
2. In the Figma desktop app, open **Menu → Plugins → Development → Import plugin from manifest…**.
3. Select `public/manifest.json` from this repository.

The plugin then shows up under **Plugins → Development → DiceBear Studio**.

## Scripts

| Script               | What it does                                                               |
| -------------------- | -------------------------------------------------------------------------- |
| `npm run dev`        | Rebuilds the UI (`dist/index.html`) and sandbox (`dist/code.js`) on change |
| `npm run build`      | Type-checks, then builds UI and sandbox for production                     |
| `npm run type-check` | Runs `vue-tsc --noEmit`                                                    |

While `npm run dev` is running, re-run the plugin in Figma after each change (right-click the plugin → **Run**) to pick
up the latest build.

## How the plugin is structured

```
src/
├── code/        # Figma sandbox script (has access to the Figma API)
│   ├── export/     # Builds the exported files or definition
│   ├── queries/    # Walks the Figma node tree
│   ├── settings/   # Reads/writes plugin data on the frame
│   ├── templates/  # Handlebars templates for the 9.x package export
│   └── utils/
├── ui/          # Vue 3 UI shown in the Figma plugin window
│   ├── components/
│   ├── stores/     # Pinia stores
│   └── styles/
└── env.d.ts
public/manifest.json  # Figma plugin manifest
```

The plugin has two entry points, each built by Vite into `dist/`:

- **UI** (`src/ui/`): a Vue 3 app (`index.html` → `dist/index.html`) that runs in the plugin's iframe. It uses PrimeVue
  for controls and Pinia for state.
- **Sandbox** (`src/code/`): the Figma plugin script (`src/code/index.ts` → `dist/code.js`) with access to the Figma
  API.

The two sides exchange typed messages:

- UI → sandbox: `parent.postMessage({ pluginMessage: … })` wrapped by `src/ui/utils/postPluginMessage.ts`.
- Sandbox → UI: `figma.ui.postMessage(…)` wrapped by `src/code/utils/processTask.ts`.

Settings that belong to a frame (title, license, DiceBear version, per-component probability, per-color-group
constraints, etc.) are persisted with `node.setPluginData` / `node.getPluginData` in `src/code/settings/`.

## Export formats

There are two output paths, selected by [`useDefinitionFile`](./src/code/utils/useDefinitionFile.ts) based on the
DiceBear version chosen in the plugin:

- **10.x**: a single JSON definition produced by `src/code/export/createExportDefinition.ts`. It follows the
  [style definition schema](https://www.dicebear.com/specification/definition-schema/).
- **9.x**: a zip of Handlebars-rendered package files (sources, tests, `package.json`, README, license) produced by
  `src/code/export/createExportFiles.ts` from templates in `src/code/templates/`.

If you change one of these formats, touch the other path too wherever the change applies, and update the templates or
tests that depend on it.

## Before you open a pull request

Run:

```sh
npm run type-check
npm run build
```

Then smoke-test the change in the Figma desktop app against a real frame. The basics to check:

- Selecting a frame still triggers `prepareExport` and the UI renders the settings without errors.
- A setting you changed survives closing and reopening the plugin (it should go through `setFrameSettings`,
  `setComponentGroupSettings`, or `setColorGroupSettings`).
- If your change touches export code, run both the 10.x JSON export and the 9.x zip export and verify the output.

## Code style

- Prettier handles formatting (see `.prettierrc`): 120 columns, single quotes, prose wrap.
- Indentation is two spaces (see `.editorconfig`).
- TypeScript everywhere; Vue SFCs use `<script setup lang="ts">`.
- Do not import from the DOM or from Vue inside `src/code/`. That code runs in Figma's QuickJS sandbox, not a browser.

## Licensing

By submitting a pull request, you agree that your contribution will be released under the [MIT License](./LICENSE).
