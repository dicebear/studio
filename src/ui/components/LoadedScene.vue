<script setup lang="ts">
import { computed } from 'vue';
import usePluginStore from '@/stores/plugin';
import { useDefinitionFile } from '@/utils/useDefinitionFile';
import MenuItem from './MenuItem.vue';
import GeneralForm from './forms/GeneralForm.vue';
import PackageForm from './forms/PackageForm.vue';
import LicenseForm from './forms/LicenseForm.vue';
import HookForm from './forms/HookForm.vue';
import ComponentGroupForm from './forms/ComponentGroupForm.vue';
import ColorGroupForm from './forms/ColorGroupForm.vue';

const store = usePluginStore();

const data = computed(() => store.data!);

const isDefinition = computed(() =>
  useDefinitionFile(data.value.frame.settings.dicebearVersion),
);

const componentGroupNames = computed(() => Object.keys(data.value.components));

const usedColorGroups = computed(() =>
  Object.keys(data.value.colors).filter(
    (name) => data.value.colors[name].isUsedByComponents,
  ),
);
</script>

<template>
  <div class="left">
    <div class="menu-wrapper">
      <div class="menu-section">Frame</div>
      <MenuItem kind="general">General</MenuItem>
      <MenuItem v-if="!isDefinition" kind="package">Package</MenuItem>
      <MenuItem kind="license">License</MenuItem>
      <MenuItem v-if="!isDefinition" kind="hook">Hooks</MenuItem>
    </div>

    <div v-if="componentGroupNames.length > 0" class="menu-wrapper">
      <div class="menu-section">Components</div>
      <MenuItem
        v-for="name in componentGroupNames"
        :key="name"
        kind="component"
        :name="name"
      >
        {{ name }}
      </MenuItem>
    </div>

    <div
      v-if="usedColorGroups.length > 0 && isDefinition"
      class="menu-wrapper"
    >
      <div class="menu-section">Colors</div>
      <MenuItem
        v-for="name in usedColorGroups"
        :key="name"
        kind="color"
        :name="name"
      >
        {{ name }}
      </MenuItem>
    </div>
  </div>

  <div :key="`${store.activeStageKind}:${store.activeStageName}`" class="right">
    <ComponentGroupForm
      v-if="store.activeStageKind === 'component'"
      :component-group="store.activeStageName"
    />
    <ColorGroupForm
      v-else-if="store.activeStageKind === 'color'"
      :color-group="store.activeStageName"
    />
    <PackageForm v-else-if="store.activeStageKind === 'package'" />
    <LicenseForm v-else-if="store.activeStageKind === 'license'" />
    <HookForm v-else-if="store.activeStageKind === 'hook'" />
    <GeneralForm v-else />
  </div>
</template>

<style scoped>
.left {
  width: 241px;
  border-right: 1px solid var(--figma-color-border);
  flex-shrink: 0;
  overflow: auto;
}

.right {
  width: 100%;
  overflow: auto;
  padding: 8px;
}

.menu-section {
  height: 32px;
  width: 100%;
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-size: 11px;
  font-weight: 600;
  color: var(--figma-color-text-secondary);
}

.menu-wrapper {
  margin: 8px 0;
}
</style>
