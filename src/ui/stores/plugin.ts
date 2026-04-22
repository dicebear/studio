import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { postPluginMessage } from '../utils/postPluginMessage';
import {
  sanitizeComponentSettings,
  sanitizeFrameSettings,
} from '../utils/sanitizeSettings';
import type { ExportData } from '../types';

export type SceneType = 'loading' | 'loaded' | 'error';

export type StageKind =
  | 'general'
  | 'package'
  | 'license'
  | 'hook'
  | 'component'
  | 'color';

type SettingsSnapshot = {
  frame: string;
  components: Record<string, string>;
  colors: Record<string, string>;
};

function snapshotSettings(nextData: ExportData): SettingsSnapshot {
  sanitizeFrameSettings(nextData.frame.settings);

  const components: Record<string, string> = {};

  for (const key in nextData.components) {
    sanitizeComponentSettings(nextData.components[key].settings);
    components[key] = JSON.stringify(nextData.components[key].settings);
  }

  const colors: Record<string, string> = {};

  for (const key in nextData.colors) {
    colors[key] = JSON.stringify(nextData.colors[key].settings);
  }

  return {
    frame: JSON.stringify(nextData.frame.settings),
    components,
    colors,
  };
}

const usePluginStore = defineStore('plugin', () => {
  const type = ref<SceneType>('loading');
  const data = ref<ExportData | null>(null);
  const message = ref<string>('');
  const activeStageKind = ref<StageKind>('general');
  const activeStageName = ref<string>('');

  let snapshot: SettingsSnapshot | null = null;

  watch(
    data,
    (nextData) => {
      if (!nextData) {
        snapshot = null;

        return;
      }

      const next = snapshotSettings(nextData);

      if (type.value === 'loaded' && snapshot) {
        if (next.frame !== snapshot.frame) {
          postPluginMessage('set:frame', JSON.parse(next.frame));
        }

        for (const key in next.components) {
          if (next.components[key] !== snapshot.components[key]) {
            postPluginMessage(`set:components:${key}`, JSON.parse(next.components[key]));
          }
        }

        for (const key in next.colors) {
          if (next.colors[key] !== snapshot.colors[key]) {
            postPluginMessage(`set:colors:${key}`, JSON.parse(next.colors[key]));
          }
        }
      }

      snapshot = next;
    },
    { deep: true },
  );

  return {
    type,
    data,
    message,
    activeStageKind,
    activeStageName,
  };
});

export default usePluginStore;
