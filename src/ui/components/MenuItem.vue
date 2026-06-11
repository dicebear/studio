<script setup lang="ts">
import { computed } from 'vue';
import usePluginStore, { type StageKind } from '@/stores/plugin';

const props = defineProps<{
  kind: StageKind;
  name?: string;
}>();

const store = usePluginStore();

const targetName = computed(() => props.name ?? '');

const isActive = computed(() => store.activeStageKind === props.kind && store.activeStageName === targetName.value);

function onClick() {
  store.activeStageKind = props.kind;
  store.activeStageName = targetName.value;
}
</script>

<template>
  <button type="button" class="menu-item" :class="{ active: isActive }" @click="onClick">
    <slot />
  </button>
</template>

<style scoped>
.menu-item {
  height: 32px;
  width: 100%;
  display: flex;
  align-items: center;
  padding: 0 15px;
  border: 1px solid transparent;
  font-size: 11px;
  font-weight: 400;
  text-align: left;
  color: var(--figma-color-text);
  transition:
    background-color 120ms ease,
    border-color 120ms ease;
}

.menu-item:hover:not(.active) {
  border-color: var(--figma-color-border-brand-strong);
}

.active {
  background-color: var(--figma-color-bg-brand-tertiary);
  border-color: var(--figma-color-bg-brand-tertiary);
}
</style>
