// @ts-ignore
import { optimize } from 'svgo/browser';
import { Export } from '../types';
import { normalizeName } from '../utils/normalizeName';
import { useDefinitionFile } from '../utils/useDefinitionFile';
import { PluginConfig } from 'svgo';
import { cleanupNumericValues } from './cleanupNumericValues';
import { convertPathToShape } from './convertPathToShape';
import { normalizeArcFlags } from './normalizeArcFlags';
import type { NodeSerializer } from '../serializer/serializeNode';

export async function createTemplateString(
  exportData: Export,
  node: FrameNode | ComponentNode,
  serialize: NodeSerializer,
) {
  let result: string;

  try {
    result = await serialize(node);
  } catch (e) {
    // The name tells the user which of a few hundred variants failed.
    throw new Error(`Error while exporting ${node.name}: ${e instanceof Error ? e.message : String(e)}`);
  }

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
    // Rectangles become paths so that mergePaths can fold neighbours with the
    // same attributes into one element. Pixel styles shrink by a quarter. The
    // CLI optimizer runs the same pair, so an export passes its check.
    'convertShapeToPath',
    'mergePaths',
  ];

  // svgo keeps the parsed path data of an element across its passes, so a
  // path that mergePaths joins late is converted from the full-precision
  // coordinates, while a fresh parse of the rounded text can still find a
  // shorter form (an absolute move in place of a relative one, say). The CLI
  // check parses fresh, so the export runs until a fresh parse leaves it
  // alone. Almost every component settles on the first pass.
  for (let pass = 0; pass < 3; pass++) {
    const optimized = optimize(result, {
      multipass: true,
      plugins: plugins,
    }).data.trim();

    if (optimized === result) {
      break;
    }

    result = optimized;
  }

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
