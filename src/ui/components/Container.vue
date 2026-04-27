<script setup lang="ts">
import { computed } from 'vue';
import usePluginStore from '@/stores/plugin';
import { postPluginMessage } from '@/utils/postPluginMessage';
import { hasPendingChanges } from '@/utils/normalize';
import LoadingScene from './LoadingScene.vue';
import LoadedScene from './LoadedScene.vue';
import ErrorScene from './ErrorScene.vue';

const store = usePluginStore();

const activeNormalizeGroup = computed(() => {
  if (
    store.type !== 'loaded' ||
    store.activeStageKind !== 'component' ||
    store.componentTab !== 'normalize'
  ) {
    return null;
  }

  const group = store.data?.components[store.activeStageName];

  if (!group || group.extendsGroup) {
    return null;
  }

  return store.activeStageName;
});

const normalizeData = computed(() => {
  const name = activeNormalizeGroup.value;

  return name ? store.normalize[name] : undefined;
});

const hasPendingNormalize = computed(() =>
  normalizeData.value ? hasPendingChanges(normalizeData.value) : false,
);

function onExport() {
  postPluginMessage('export');
}

function onNormalize() {
  if (activeNormalizeGroup.value) {
    postPluginMessage('apply:normalize', {
      groupName: activeNormalizeGroup.value,
    });
  }
}
</script>

<template>
  <div class="container">
    <div class="top">
      <ErrorScene v-if="store.type === 'error'" />
      <LoadedScene v-else-if="store.type === 'loaded' && store.data" />
      <LoadingScene v-else />
    </div>
    <div class="bottom">
      <Button
        v-if="activeNormalizeGroup"
        label="Normalize variants"
        severity="secondary"
        size="small"
        :disabled="!hasPendingNormalize"
        @click="onNormalize"
      />
      <Button
        label="Export"
        size="small"
        :disabled="store.type !== 'loaded'"
        @click="onExport"
      />
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.top {
  flex-grow: 1;
  display: flex;
  justify-content: stretch;
  overflow: hidden;
}

.bottom {
  border-top: 1px solid var(--figma-color-border);
  padding: 12px 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
