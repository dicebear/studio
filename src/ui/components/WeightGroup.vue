<script setup lang="ts">
defineProps<{
  values: Record<string, number>;
  options: readonly string[];
}>();
</script>

<template>
  <div class="weight-list">
    <label v-for="name in options" :key="name" class="weight-row">
      <span class="weight-label">{{ name }}</span>
      <input
        v-model.lazy.number="values[name]"
        type="number"
        min="0"
        max="1000000"
        step="any"
        class="weight-input"
      />
    </label>
  </div>
</template>

<style scoped>
.weight-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.weight-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.weight-label {
  color: var(--figma-color-text);
  flex: 1;
}

.weight-input {
  width: 80px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--figma-color-border);
  border-radius: 4px;
  background-color: var(--figma-color-bg);
  color: var(--figma-color-text);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.weight-input:focus {
  outline: none;
  border-color: var(--figma-color-border-selected);
}
</style>
