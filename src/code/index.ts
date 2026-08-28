import './utils/polyfills';
import { getFrameSelection } from './utils/getFrameSelection';
import { getExport, invalidateExportCache } from './export/exportCache';
import { importDefinition } from './import/importDefinition';
import { DefinitionFile } from './types';
import { processTask } from './utils/processTask';
import { setComponentGroupSettings } from './settings/setComponentGroupSettings';
import { setFrameSettings } from './settings/setFrameSettings';
import { getFrameSettings } from './settings/getFrameSettings';
import { createExport } from './export/createExport';
import { setColorGroupSettings } from './settings/setColorGroupSettings';
import { prepareNormalize } from './normalize/prepareNormalize';
import { applyNormalize } from './normalize/applyNormalize';

figma.showUI(__html__, { width: 720, height: 400 });

figma.skipInvisibleInstanceChildren = true;

// The import changes pages and the selection itself. Reacting to those events
// would race the import's own result message.
let importInProgress = false;

figma.on('selectionchange', () => {
  if (importInProgress) {
    return;
  }

  processTask(
    async () => ({
      type: 'loaded',
      data: await getExport(),
    }),
    true,
  );
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

async function postNormalize(groupName: string, precision: number): Promise<void> {
  try {
    figma.ui.postMessage({
      type: 'normalize',
      data: await prepareNormalize(groupName, precision),
    });
  } catch (e: any) {
    figma.ui.postMessage({
      type: 'normalize:error',
      data: { groupName, message: e.message },
    });
  }
}

figma.ui.onmessage = async (msg) => {
  const typeSplit = msg.type.split(':');

  switch (typeSplit[0]) {
    case 'init':
      processTask(
        async () => ({
          type: 'loaded',
          data: await getExport(),
        }),
        true,
      );
      break;

    case 'set':
      switch (typeSplit[1]) {
        case 'frame':
          setFrameSettings(getFrameSelection(), msg.data);
          invalidateExportCache();
          break;

        case 'components':
          setComponentGroupSettings(getFrameSelection(), typeSplit[2], msg.data);
          invalidateExportCache();
          break;

        case 'colors':
          setColorGroupSettings(getFrameSelection(), typeSplit[2], msg.data);
          invalidateExportCache();
          break;
      }
      break;

    case 'export':
      processTask(async () => ({
        type: 'export',
        data: await createExport(),
      }));
      break;

    case 'import':
      importInProgress = true;

      processTask(async () => {
        try {
          const { definition, name } = msg.data as { definition: DefinitionFile; name: string };
          const warnings = await importDefinition(definition, name);

          invalidateExportCache();
          figma.ui.postMessage({ type: 'import:result', data: { warnings } });

          return { type: 'loaded', data: await getExport() };
        } finally {
          importInProgress = false;
        }
      });
      break;

    case 'prepare':
      if (typeSplit[1] === 'normalize') {
        await postNormalize(msg.data.groupName, getNormalizePrecision());
      }
      break;

    case 'apply':
      if (typeSplit[1] === 'normalize') {
        const precision = getNormalizePrecision();

        try {
          await applyNormalize(msg.data.groupName, precision);
        } catch (e: any) {
          figma.ui.postMessage({
            type: 'normalize:error',
            data: { groupName: msg.data.groupName, message: e.message },
          });

          break;
        }

        await postNormalize(msg.data.groupName, precision);
      }
      break;

    case 'reveal':
      if (typeSplit[1] === 'instances') {
        const ids: string[] = msg.data?.ids ?? [];
        const resolved = await Promise.all(ids.map((id) => figma.getNodeByIdAsync(id)));
        const nodes = resolved.filter((n): n is SceneNode => !!n && n.type !== 'PAGE' && n.type !== 'DOCUMENT');

        if (nodes.length === 0) {
          break;
        }

        const targetPage = findOwnerPage(nodes[0]);

        if (!targetPage) {
          break;
        }

        if (figma.currentPage !== targetPage) {
          await figma.setCurrentPageAsync(targetPage);
        }

        const onPage = nodes.filter((n) => findOwnerPage(n) === targetPage);

        figma.currentPage.selection = onPage;
        figma.viewport.scrollAndZoomIntoView(onPage);
      }
      break;
  }
};
