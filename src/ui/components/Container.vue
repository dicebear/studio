<script setup lang="ts">
import usePluginStore from '@/stores/plugin';
import { postPluginMessage } from '@/utils/postPluginMessage';
import LoadingScene from './LoadingScene.vue';
import LoadedScene from './LoadedScene.vue';
import ErrorScene from './ErrorScene.vue';

const store = usePluginStore();

function onExport() {
  postPluginMessage('export');
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
}
</style>
