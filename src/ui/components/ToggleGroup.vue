<script setup lang="ts">
defineProps<{
  values: Record<string, boolean>;
  options: readonly string[];
}>();
</script>

<template>
  <div class="toggle-list">
    <label v-for="name in options" :key="name" class="toggle-row">
      <ToggleSwitch v-model="values[name]" />
      <span class="toggle-label">{{ name }}</span>
    </label>
  </div>
</template>

<style scoped>
.toggle-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 11px;
}

.toggle-label {
  color: var(--figma-color-text);
}
</style>
