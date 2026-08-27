<script setup lang="ts">
import { computed, ref } from 'vue';
import usePluginStore from '@/stores/plugin';
import { postPluginMessage } from '@/utils/postPluginMessage';
import { hasPendingChanges } from '@/utils/normalize';
import { validateDefinition } from '@/utils/validateDefinition';
import LoadingScene from './LoadingScene.vue';
import LoadedScene from './LoadedScene.vue';
import ErrorScene from './ErrorScene.vue';
import WelcomeScene from './WelcomeScene.vue';

const store = usePluginStore();

const activeNormalizeGroup = computed(() => {
  if (store.type !== 'loaded' || store.activeStageKind !== 'component' || store.componentTab !== 'normalize') {
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

const hasPendingNormalize = computed(() => (normalizeData.value ? hasPendingChanges(normalizeData.value) : false));

function onExport() {
  postPluginMessage('export');
}

const fileInput = ref<HTMLInputElement | null>(null);

function onImportClick() {
  fileInput.value?.click();
}

async function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  input.value = '';

  if (!file) {
    return;
  }

  let definition: unknown;

  try {
    definition = JSON.parse(await file.text());
  } catch {
    store.type = 'error';
    store.message = 'The selected file is not valid JSON.';

    return;
  }

  const problems = validateDefinition(definition);

  if (problems.length > 0) {
    const shown = problems.slice(0, 5);

    if (problems.length > shown.length) {
      shown.push(`and ${problems.length - shown.length} more`);
    }

    store.type = 'error';
    store.message = `The selected file is not a valid DiceBear definition: ${shown.join('; ')}`;

    return;
  }

  store.importWarnings = [];
  store.type = 'loading';
  store.message = '';

  postPluginMessage('import', {
    name: file.name.replace(/\.json$/i, ''),
    definition,
  });
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
      <WelcomeScene v-if="store.type === 'welcome'" />
      <ErrorScene v-else-if="store.type === 'error'" />
      <LoadedScene v-else-if="store.type === 'loaded' && store.data" />
      <LoadingScene v-else />
    </div>
    <div v-if="store.importWarnings.length > 0" class="warnings">
      <div class="warnings-header">
        <strong>Import warnings ({{ store.importWarnings.length }})</strong>
        <Button label="Dismiss" severity="secondary" text size="small" @click="store.importWarnings = []" />
      </div>
      <ul class="warnings-list">
        <li v-for="(warning, index) in store.importWarnings" :key="index">{{ warning }}</li>
      </ul>
    </div>
    <div class="bottom">
      <input ref="fileInput" class="file-input" type="file" accept=".json,application/json" @change="onImportFile" />
      <Button
        label="Import"
        severity="secondary"
        size="small"
        class="import"
        :disabled="store.type === 'loading'"
        @click="onImportClick"
      />
      <Button
        v-if="activeNormalizeGroup"
        label="Normalize variants"
        severity="secondary"
        size="small"
        :disabled="!hasPendingNormalize"
        @click="onNormalize"
      />
      <Button label="Export" size="small" :disabled="store.type !== 'loaded'" @click="onExport" />
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

.import {
  margin-right: auto;
}

.file-input {
  display: none;
}

.warnings {
  border-top: 1px solid var(--figma-color-border);
  padding: 8px 16px;
  font-size: 11px;
  background-color: var(--figma-color-bg-secondary);
}

.warnings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.warnings-list {
  margin: 4px 0 0;
  padding-left: 16px;
  max-height: 96px;
  overflow-y: auto;
  color: var(--figma-color-text-secondary);
}
</style>
