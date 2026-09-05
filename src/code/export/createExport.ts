import { kebabCase } from 'change-case';
import { getExport } from './exportCache';
import { createExportDefinition } from './createExportDefinition';

export async function createExport() {
  const exportData = await getExport();
  const name = kebabCase(exportData.frame.settings.title.replace(/[^a-z0-9\-\_\s]/gi, '').trim()) || 'avatar';
  const warnings = new Set<string>();

  const content = await createExportDefinition(exportData, (message) => {
    warnings.add(message);
  });

  return {
    content,
    name,
    warnings: [...warnings],
  };
}
