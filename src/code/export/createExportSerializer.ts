import { Export } from '../types';
import { createSerializer, type NodeSerializer } from '../serializer/serializeNode';
import { useAnimations, useDefinitionFile } from '../utils/useDefinitionFile';

/**
 * The serializer for one export, with the switches the chosen DiceBear line
 * implies. One per export, so the style lookups and the `currentColor` probe
 * are answered once for every component that follows.
 */
export function createExportSerializer(exportData: Export, warn: (message: string) => void = () => {}): NodeSerializer {
  return createSerializer({
    aliasesEnabled: useDefinitionFile(exportData.frame.settings.dicebearVersion),
    animationsEnabled: useAnimations(exportData.frame.settings.dicebearVersion),
    warn,
  });
}
