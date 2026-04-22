<script setup lang="ts">
import usePluginStore from '@/stores/plugin';

const store = usePluginStore();
</script>

<template>
  <div class="loader">
    <ProgressSpinner
      class="spinner"
      style="width: 32px; height: 32px"
      stroke-width="4"
    />
    <p class="title">Processing</p>
    <p class="hint">
      {{
        store.message ||
          'This can take a while on large files. Please do not change the file until the process is complete.'
      }}
    </p>
  </div>
</template>

<style scoped>
.loader {
  align-self: center;
  margin: 0 auto;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  font-size: 11px;
  color: var(--figma-color-text);
}

.spinner {
  margin-bottom: 24px;
}

.title {
  font-weight: 600;
  margin-bottom: 6px;
}

.hint {
  color: var(--figma-color-text-secondary);
  max-width: 360px;
}
</style>
