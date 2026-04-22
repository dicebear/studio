<script setup lang="ts">
import usePluginStore from '@/stores/plugin';

const store = usePluginStore();
</script>

<template>
  <div class="error">
    <div class="message">
      {{ store.message }}
    </div>
    <div class="help">
      <p class="help-title"><strong>Need help?</strong></p>
      <p>
        <a href="https://dicebear.com" target="_blank" rel="noopener">Read Documentation</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.error {
  align-self: center;
  margin: 0 auto;
  padding: 40px;
  text-align: center;
}

.message {
  padding: 16px 20px;
  margin-bottom: 24px;
  border-radius: 4px;
  background-color: var(--figma-color-bg-danger-tertiary);
  border: 1px solid var(--figma-color-border-danger);
  color: var(--figma-color-text-danger);
  font-size: 11px;
}

.help {
  font-size: 11px;
}

.help-title {
  margin-bottom: 4px;
}
</style>
