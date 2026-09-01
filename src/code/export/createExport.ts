import { kebabCase } from 'change-case';
import { getExport } from './exportCache';
import { createExportFiles } from './createExportFiles';
import { createExportDefinition } from './createExportDefinition';
import { useDefinitionFile } from '../utils/useDefinitionFile';

export async function createExport() {
  const exportData = await getExport();
  const name = kebabCase(exportData.frame.settings.title.replace(/[^a-z0-9\-\_\s]/gi, '').trim()) ?? 'avatar';

  if (useDefinitionFile(exportData.frame.settings.dicebearVersion)) {
    const warnings = new Set<string>();

    const content = await createExportDefinition(exportData, (message) => {
      warnings.add(message);
    });

    return {
      content,
      name,
      warnings: [...warnings],
    };
  } else {
    return {
      files: await createExportFiles(exportData),
      name,
    };
  }
}
