// @ts-ignore
import { optimize } from 'svgo/browser';
import { Export } from '../types';
import { normalizeName } from '../utils/normalizeName';
import { applyNodeExportInfo } from './applyNodeExportInfo';
import { calculateNodeExportInfo } from './calculateNodeExportInfo';
import { useAnimations, useDefinitionFile } from '../utils/useDefinitionFile';
import { PluginConfig } from 'svgo';
import { cleanupNumericValues } from './cleanupNumericValues';
import { convertPathToShape } from './convertPathToShape';
import { normalizeArcFlags } from './normalizeArcFlags';

export async function createTemplateString(
  exportData: Export,
  node: FrameNode | ComponentNode,
  warn: (message: string) => void = () => {},
) {
  const aliasesEnabled = useDefinitionFile(exportData.frame.settings.dicebearVersion);
  const animationsEnabled = useAnimations(exportData.frame.settings.dicebearVersion);

  // Calculate the export info for the node and export to svg
  let result = await calculateNodeExportInfo(node, aliasesEnabled, animationsEnabled, warn);

  // Apply export info to svg
  result = await applyNodeExportInfo(result);

  // Optimize the svg
  const plugins: PluginConfig[] = [
    'cleanupIds',
    {
      name: 'prefixIds',
      params: {
        prefix: normalizeName(node.name),
        delim: '-',
      },
    },
    'removeUselessDefs',
    'removeUnknownsAndDefaults',
    'removeUselessStrokeAndFill',
    'collapseGroups',
    {
      name: 'convertPathData',
      params: {
        floatPrecision: exportData.frame.settings.precision,
      },
    },
    convertPathToShape({
      floatPrecision: exportData.frame.settings.precision,
    }),
    normalizeArcFlags(),
    {
      name: 'convertTransform',
      params: {
        floatPrecision: exportData.frame.settings.precision,
      },
    },
    cleanupNumericValues({
      floatPrecision: exportData.frame.settings.precision,
    }),
    'mergePaths',
  ];

  result = optimize(result, {
    multipass: true,
    plugins: plugins,
  }).data.trim();

  // Remove svg tag
  result = result.replace(/(^<svg.*?>|<\/svg>$)/gi, '');

  if (useDefinitionFile(exportData.frame.settings.dicebearVersion)) {
    // Replace colors
    result = result.replace(/{{colors\.([a-z0-9]*)}}/gi, 'url(#color-$1)');

    // Replace components
    result = result.replace(/{{components\.([a-z0-9]*)}}/gi, `<use href="#component-$1"/>`);

    return result;
  }

  // Escape JS template string characters
  result = result.replace(/(\\|\$|\`)/g, '$1');

  // Replace colors
  result = result.replace(/{{colors\.([a-z0-9]*)}}/gi, '${escape.xml(`${colors.$1}`)}');

  // Replace components
  result = result.replace(/{{components\.([a-z0-9]*)}}/gi, "${components.$1?.value(components, colors) ?? ''}");

  return '`' + result + '`';
}
