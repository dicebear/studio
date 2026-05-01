import { Export } from '../types';
import { getFrameSelection } from '../utils/getFrameSelection';
import { prepareExport } from './prepareExport';

type CacheEntry = {
  frameId: string;
  version: number;
  data: Export;
};

let cached: CacheEntry | null = null;
let version = 0;
let documentListenerInstalled = false;

export function invalidateExportCache(): void {
  version++;
}

export async function getExport(): Promise<Export> {
  const frame = getFrameSelection();

  if (cached && cached.frameId === frame.id && cached.version === version) {
    return cached.data;
  }

  const data = await prepareExport(frame);

  cached = { frameId: frame.id, version, data };

  if (!documentListenerInstalled) {
    // `prepareExport` calls `loadAllPagesAsync`, which is the precondition
    // for subscribing to `documentchange` under `documentAccess: dynamic-page`.
    figma.on('documentchange', invalidateExportCache);
    documentListenerInstalled = true;
  }

  return data;
}
