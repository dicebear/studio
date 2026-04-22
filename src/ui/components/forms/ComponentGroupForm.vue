<script setup lang="ts">
import { computed } from 'vue';
import usePluginStore from '@/stores/plugin';
import { useDefinitionFile } from '@/utils/useDefinitionFile';
import Field from '../Field.vue';
import ToggleGroup from '../ToggleGroup.vue';

const props = defineProps<{ componentGroup: string }>();

const store = usePluginStore();

const settings = computed(() => store.data!.components[props.componentGroup].settings);

const isDefinition = computed(() =>
  useDefinitionFile(store.data!.frame.settings.dicebearVersion),
);

type NumericOption = { label: string; value: number | null };

function numericOptions(values: number[]): NumericOption[] {
  return [
    { label: '- None -', value: null },
    ...values.map((v) => ({ label: String(v), value: v })),
  ];
}

const rotations = numericOptions([
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180,
]);

const offsets = numericOptions([
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
]);

const defaultsKeys = computed(() => Object.keys(settings.value.defaults));
</script>

<template>
  <Field label="Probability (in percent)">
    <InputNumber
      v-model="settings.probability"
      :min="0"
      :max="100"
      placeholder="Leave blank to disable option"
      fluid
      size="small"
    />
  </Field>

  <Field label="Allowed Rotation (in deg)">
    <Select
      v-model="settings.rotation"
      :options="rotations"
      option-label="label"
      option-value="value"
      fluid
      size="small"
    />
  </Field>

  <Field label="Allowed Horizontal Offset">
    <Select
      v-model="settings.offsetX"
      :options="offsets"
      option-label="label"
      option-value="value"
      fluid
      size="small"
    />
  </Field>

  <Field label="Allowed Vertical Offset">
    <Select
      v-model="settings.offsetY"
      :options="offsets"
      option-label="label"
      option-value="value"
      fluid
      size="small"
    />
  </Field>

  <Field v-if="!isDefinition" label="Defaults">
    <ToggleGroup :values="settings.defaults" :options="defaultsKeys" />
  </Field>
</template>
