import { FrameSettings } from '../types';

const DEFAULTS: FrameSettings = {
  title: '',
  creator: '',
  homepage: '',
  sourceTitle: '',
  source: '',
  licenseName: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  licenseText: '',
  shapeRendering: 'auto',
  backgroundColorGroupName: '',
  precision: 3,
};

/**
 * The settings stored on the avatar frame. Only the known keys are read, so a
 * file written by an older plugin version drops what it no longer needs, such
 * as the DiceBear version or the npm package fields, on the next write.
 */
export function getFrameSettings(frame: FrameNode, colorGroups: string[]): FrameSettings {
  const stored = JSON.parse(frame.getPluginData(`settings`) || '{}') as Partial<Record<keyof FrameSettings, unknown>>;
  const data: FrameSettings = { ...DEFAULTS };

  for (const key of Object.keys(DEFAULTS) as (keyof FrameSettings)[]) {
    const value = stored[key];

    if (typeof value === typeof DEFAULTS[key]) {
      (data as Record<keyof FrameSettings, unknown>)[key] = value;
    }
  }

  if (!data.title) {
    data.title = 'My Avatar Style';
  }

  if (false === colorGroups.includes(data.backgroundColorGroupName)) {
    data.backgroundColorGroupName = '';
  }

  return data;
}
