<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <div class="field">
    <div class="field-label">{{ label }}</div>
    <slot />
  </div>
</template>

<style scoped>
.field {
  margin-bottom: 12px;
}

.field-label {
  height: 28px;
  display: flex;
  align-items: center;
  padding: 0 2px;
  font-size: 11px;
  font-weight: 600;
  color: var(--figma-color-text);
}
</style>
