<script setup lang="ts">
import { computed } from 'vue';
import usePluginStore from '@/stores/plugin';
import Field from '../Field.vue';
import ToggleGroup from '../ToggleGroup.vue';

const props = defineProps<{ colorGroup: string }>();

const store = usePluginStore();

const settings = computed(() => store.data!.colors[props.colorGroup].settings);

const otherUsedColorGroups = computed(() =>
  Object.keys(store.data!.colors).filter(
    (name) => store.data!.colors[name].isUsedByComponents && name !== props.colorGroup,
  ),
);

const contrastOptions = computed<Array<{ label: string; value: string | null }>>(() => [
  { label: '- None -', value: null },
  { label: 'background', value: 'background' },
  ...otherUsedColorGroups.value.map((name) => ({ label: name, value: name })),
]);

const notEqualOptions = computed(() => ['background', ...otherUsedColorGroups.value]);
</script>

<template>
  <Field label="Should be a contrast color to:">
    <Select
      v-model="settings.contrastTo"
      :options="contrastOptions"
      option-label="label"
      option-value="value"
      fluid
      size="small"
    />
  </Field>

  <Field label="Should not be identical with:">
    <ToggleGroup :values="settings.notEqualTo" :options="notEqualOptions" />
  </Field>
</template>
