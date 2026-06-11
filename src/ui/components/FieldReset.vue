<script setup lang="ts">
import { RotateCcw } from '@lucide/vue';
</script>

<template>
  <Button size="small" severity="secondary" v-tooltip="'Reset to default'" class="field-reset field-toggle">
    <RotateCcw :size="14" />
  </Button>
</template>

<style>
.field-reset:hover,
.field-reset:focus-visible {
  color: var(--p-red-500) !important;
}

.field-reset:not(.p-button-link):hover,
.field-reset:not(.p-button-link):focus-visible {
  background: color-mix(in srgb, var(--p-red-500) 12%, transparent) !important;
  border-color: transparent !important;
}
</style>
