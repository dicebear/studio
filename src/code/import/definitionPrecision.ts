import { DefinitionElement, DefinitionFile } from '../types';

/**
 * Attributes normalized to the 0..1 range. The export writes them with two
 * decimals whatever the setting is, so they only raise it beyond that.
 */
const NORMALIZED_ATTRIBUTES = new Set([
  'opacity',
  'fill-opacity',
  'stroke-opacity',
  'stop-opacity',
  'flood-opacity',
  'offset',
]);

const MIN_NORMALIZED_DECIMALS = 2;

/** The range the precision setting offers in the UI. */
const MAX_PRECISION = 8;

const NUMBERS = /[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g;
const TRANSFORM_FUNCTIONS = /(translate|matrix|rotate|scale|skewX|skewY)\(([^)]*)\)/g;

function decimals(value: string): number {
  const dot = value.indexOf('.');

  return dot === -1 ? 0 : value.length - dot - 1;
}

/**
 * The numbers of a transform that this setting governs, which are the ones
 * that move something. svgo rounds the factors of a scale or a matrix with its
 * own `transformPrecision` instead, so `scale(.71048)` says nothing about the
 * precision the artwork is drawn in.
 */
function transformOffsets(value: string): string[] {
  const offsets: string[] = [];

  for (const [, name, args] of value.matchAll(TRANSFORM_FUNCTIONS)) {
    const numbers = args.match(NUMBERS) ?? [];

    if (name === 'translate') {
      offsets.push(...numbers);
    } else if (name === 'matrix') {
      offsets.push(...numbers.slice(4));
    } else if (name === 'rotate') {
      // An angle is a factor, the center it turns around is not.
      offsets.push(...numbers.slice(1));
    }
  }

  return offsets;
}

/**
 * How many decimals a definition actually uses, which is what the frame's
 * precision setting is worth after an import.
 *
 * Exporting with more decimals than the source has does not make the result
 * more faithful, it only leaves room for the thousandths Figma picks up while
 * holding the artwork. A definition drawn on whole units comes back on whole
 * units, and the drift disappears instead of being rounded to a shorter form
 * of itself.
 *
 * Only the numbers the export actually rounds are counted: the attributes of
 * every element and the boxes of the canvas and the components. Component
 * ranges, weights and probabilities travel as settings and are written back
 * untouched, and the numbers inside an animation carry their own fixed
 * rounding.
 */
export function definitionPrecision(definition: DefinitionFile): number {
  let precision = 0;

  const fromNumber = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      precision = Math.max(precision, decimals(String(value)));
    }
  };

  const fromElements = (elements: DefinitionElement[]) => {
    for (const element of elements) {
      for (const [name, value] of Object.entries(element.attributes ?? {})) {
        if (typeof value !== 'string') {
          continue;
        }

        const numbers = /transform$/i.test(name) ? transformOffsets(value) : (value.match(NUMBERS) ?? []);

        for (const number of numbers) {
          const used = decimals(number);

          if (NORMALIZED_ATTRIBUTES.has(name) && used <= MIN_NORMALIZED_DECIMALS) {
            continue;
          }

          precision = Math.max(precision, used);
        }
      }

      fromElements(element.children ?? []);
    }
  };

  fromNumber(definition.canvas.width);
  fromNumber(definition.canvas.height);
  fromElements(definition.canvas.elements);

  for (const component of Object.values(definition.components ?? {})) {
    if ('extends' in component) {
      continue;
    }

    fromNumber(component.width);
    fromNumber(component.height);

    for (const variant of Object.values(component.variants)) {
      fromElements(variant.elements);
    }
  }

  return Math.min(precision, MAX_PRECISION);
}
