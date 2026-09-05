import type { Mode } from '@shared/messages';
import { AVATAR_DATA_KEY, decodeAvatarRecord, type AvatarRecord } from '@shared/avatarRecord';
import { clampWindow, DEFAULT_PREFS } from '@shared/prefs';
import { installBridge, onEvent, onRequest, postEvent } from './bridge';
import { readPrefs, writePrefs } from './prefs';
import { describeSelection } from './selection/describeSelection';
import {
  noteSelectionChange,
  onSelectionChange,
  selectionEventsSuppressed,
  suppressSelectionEvents,
  withoutSelectionEvents,
} from './selection/suppress';
import { getFrameSelection } from './utils/getFrameSelection';
import { invalidateExportCache } from './export/exportCache';
import { describeImportBlock, importDefinition } from './import/importDefinition';
import { DefinitionFile } from './types';
import { refreshStyle } from './utils/processTask';
import { setComponentGroupSettings } from './settings/setComponentGroupSettings';
import { setFrameSettings } from './settings/setFrameSettings';
import { getFrameSettings } from './settings/getFrameSettings';
import { createExport } from './export/createExport';
import { setColorGroupSettings } from './settings/setColorGroupSettings';
import { prepareNormalize } from './normalize/prepareNormalize';
import { applyNormalize } from './normalize/applyNormalize';
import { acknowledgeProgress } from './utils/postProgress';
import { beginJob, endJob, runChunk } from './generate/batches';

/** How long a burst of selection changes settles before the window hears of it. */
const SELECTION_DEBOUNCE_MS = 50;

/** Where the Generate settings of this document live. */
const FILE_SETTINGS_KEY = 'generate';

let prefs = DEFAULT_PREFS;
let mode: Mode = prefs.mode;
let selectionTimer: ReturnType<typeof setTimeout> | null = null;

figma.skipInvisibleInstanceChildren = true;

// The window opens right away at the default size and takes the remembered
// one as soon as the store answers.
figma.showUI(__html__, { themeColors: true, ...DEFAULT_PREFS.window });

void readPrefs().then((stored) => {
  prefs = stored;
  mode = stored.mode;
  figma.ui.resize(stored.window.width, stored.window.height);
});

function reportSelection(): void {
  postEvent({ type: 'selection:changed', selection: describeSelection(mode === 'generate') });

  if (mode === 'style') {
    refreshStyle();
  }
}

onSelectionChange(reportSelection);

figma.on('selectionchange', () => {
  if (selectionEventsSuppressed()) {
    noteSelectionChange();

    return;
  }

  if (selectionTimer !== null) {
    clearTimeout(selectionTimer);
  }

  selectionTimer = setTimeout(() => {
    selectionTimer = null;
    reportSelection();
  }, SELECTION_DEBOUNCE_MS);
});

function getNormalizePrecision(): number {
  return getFrameSettings(getFrameSelection(), []).precision;
}

function findOwnerPage(node: BaseNode): PageNode | null {
  let current: BaseNode | null = node;

  while (current && current.type !== 'PAGE') {
    current = current.parent;
  }

  return current as PageNode | null;
}

/** The first avatar record in the selection, for a relaunch button. */
function findRelaunchRecord(): AvatarRecord | null {
  const visit = (node: SceneNode): AvatarRecord | null => {
    const record = decodeAvatarRecord(node.getPluginData(AVATAR_DATA_KEY));

    if (record) {
      return record;
    }

    if ('children' in node) {
      for (const child of node.children) {
        const found = visit(child);

        if (found) {
          return found;
        }
      }
    }

    return null;
  };

  for (const node of figma.currentPage.selection) {
    const found = visit(node);

    if (found) {
      return found;
    }
  }

  return null;
}

async function savePrefs(patch: Partial<typeof prefs>): Promise<void> {
  prefs = { ...prefs, ...patch };
  await writePrefs(prefs);
}

function readFileSettings(): unknown {
  try {
    const raw = figma.root.getPluginData(FILE_SETTINGS_KEY);

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

onEvent('ui:ready', (event) => {
  mode = event.mode;

  postEvent({
    type: 'plugin:init',
    prefs,
    selection: describeSelection(mode === 'generate'),
    command: figma.command || null,
    relaunch: figma.command ? findRelaunchRecord() : null,
    fileSettings: readFileSettings(),
  });

  if (mode === 'style') {
    refreshStyle();
  }
});

onEvent('ui:mode', (event) => {
  mode = event.mode;
  void savePrefs({ mode });
  reportSelection();
});

onEvent('ui:resize', (event) => {
  const size = clampWindow(event);

  figma.ui.resize(size.width, size.height);
  void savePrefs({ window: size });
});

onEvent('prefs:set', (event) => {
  void savePrefs(event.prefs);
});

onEvent('file-settings:set', (event) => {
  figma.root.setPluginData(FILE_SETTINGS_KEY, JSON.stringify(event.settings));
});

onEvent('progress:painted', (event) => {
  acknowledgeProgress(event.step);
});

onEvent('style:refresh', () => {
  refreshStyle();
});

onEvent('settings:frame:set', (event) => {
  setFrameSettings(getFrameSelection(), event.settings);
  invalidateExportCache();
});

onEvent('settings:component:set', (event) => {
  setComponentGroupSettings(getFrameSelection(), event.group, event.settings);
  invalidateExportCache();
});

onEvent('settings:color:set', (event) => {
  setColorGroupSettings(getFrameSelection(), event.group, event.settings);
  invalidateExportCache();
});

onRequest('export:run', async () => createExport());

onRequest('import:run', async ({ definition, name, picksBySeed }) =>
  withoutSelectionEvents(async () => {
    const warnings = await importDefinition(definition as DefinitionFile, name, picksBySeed);

    invalidateExportCache();

    return { warnings };
  }),
);

onRequest('import:check', async () => ({ blocked: await describeImportBlock() }));

onRequest('normalize:prepare', async ({ group }) => prepareNormalize(group, getNormalizePrecision()));

onRequest('normalize:apply', async ({ group }) => {
  const precision = getNormalizePrecision();

  await applyNormalize(group, precision);

  return prepareNormalize(group, precision);
});

onRequest('reveal:instances', async ({ ids }) => {
  const resolved = await Promise.all(ids.map((id) => figma.getNodeByIdAsync(id)));
  const nodes = resolved.filter((n): n is SceneNode => !!n && n.type !== 'PAGE' && n.type !== 'DOCUMENT');
  const targetPage = nodes.length > 0 ? findOwnerPage(nodes[0]) : null;

  if (!targetPage) {
    return {};
  }

  if (figma.currentPage !== targetPage) {
    await figma.setCurrentPageAsync(targetPage);
  }

  const onPage = nodes.filter((n) => findOwnerPage(n) === targetPage);

  figma.currentPage.selection = onPage;
  figma.viewport.scrollAndZoomIntoView(onPage);

  return {};
});

onRequest('storage:get', async ({ key }) => ({ value: await figma.clientStorage.getAsync(key) }));

onRequest('storage:set', async ({ key, value }) => {
  await figma.clientStorage.setAsync(key, value);

  return {};
});

onRequest('storage:delete', async ({ key }) => {
  await figma.clientStorage.deleteAsync(key);

  return {};
});

onRequest('storage:keys', async () => ({ keys: await figma.clientStorage.keysAsync() }));

// A job holds selection events from `begin` to `end`, across its chunks.
let releaseJob: (() => void) | null = null;

onRequest('generate:begin', async (params) => {
  releaseJob?.();
  releaseJob = suppressSelectionEvents();
  beginJob(params);

  return {};
});

onRequest('generate:chunk', async (params) => runChunk(params));

onRequest('generate:end', async (params) => {
  try {
    return endJob(params);
  } finally {
    // The job selected what it made, which the release reports.
    noteSelectionChange();
    releaseJob?.();
    releaseJob = null;
  }
});

installBridge();
