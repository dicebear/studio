import { ComponentGroupSettings } from '../types';

export function getComponentGroupSettings(frame: FrameNode, componentGroup: string): ComponentGroupSettings {
  const stored = JSON.parse(
    frame.getPluginData(`components/${componentGroup}/settings`) || '{}',
  );

  if ('offsetX' in stored && !('translateX' in stored)) {
    stored.translateX = stored.offsetX;
  }

  if ('offsetY' in stored && !('translateY' in stored)) {
    stored.translateY = stored.offsetY;
  }

  delete stored.offsetX;
  delete stored.offsetY;

  return {
    defaults: {},
    probability: null,
    rotation: null,
    translateX: null,
    translateY: null,
    ...stored,
  };
}
