import { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { filterDefaults } from '../utils/filterDefaults';
import { rangeSchemaBounds } from '../utils/rangeValue';
import sortObject from 'sort-object-keys';
import type { Export } from '../types';

const RANGE_FIELD_KEYS = ['rotation', 'translateX', 'translateY'] as const;

export function createExportJsonSchema(exportData: Export): JSONSchema7 {
  const schemaProperties: Record<string, JSONSchema7Definition> = {};

  // Components
  for (const componentGroupName in exportData.components) {
    if (false === exportData.components.hasOwnProperty(componentGroupName)) {
      continue;
    }

    const componentGroup = exportData.components[componentGroupName];

    schemaProperties[componentGroupName] = {
      type: 'array',
      items: {
        type: 'string',
        enum: Object.keys(componentGroup.collection),
      },
      default: filterDefaults(componentGroup.settings.defaults),
    };

    if (typeof componentGroup.settings.probability === 'number') {
      schemaProperties[`${componentGroupName}Probability`] = {
        type: 'integer',
        minimum: 0,
        maximum: 100,
        default: componentGroup.settings.probability,
      };
    }

    for (const key of RANGE_FIELD_KEYS) {
      const bounds = rangeSchemaBounds(componentGroup.settings[key]);

      if (!bounds) {
        continue;
      }

      const suffix = key.charAt(0).toUpperCase() + key.slice(1);

      schemaProperties[`${componentGroupName}${suffix}`] = {
        type: 'array',
        items: {
          type: 'integer',
          minimum: bounds.minimum,
          maximum: bounds.maximum,
        },
        maxItems: 2,
        default: bounds.default,
      };
    }
  }

  // Colors
  for (const colorGroupName in exportData.colors) {
    if (false === exportData.colors.hasOwnProperty(colorGroupName)) {
      continue;
    }

    const colorGroup = exportData.colors[colorGroupName];

    const propertyValue: JSONSchema7 = {
      type: 'array',
      items: {
        type: 'string',
        pattern: '^(transparent|[a-fA-F0-9]{6})$',
      },
      // The same order the definition lists the palette in, sorted by the
      // color's name in Figma.
      default: Object.entries(colorGroup.collection)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([, v]) => v.value),
    };

    if (colorGroup.isUsedByComponents) {
      schemaProperties[`${colorGroupName}Color`] = propertyValue;
    }

    if (exportData.frame.settings.backgroundColorGroupName === colorGroupName) {
      schemaProperties[`backgroundColor`] = propertyValue;
    }
  }

  // Schema JSON
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    properties: sortObject(schemaProperties),
  };
}
