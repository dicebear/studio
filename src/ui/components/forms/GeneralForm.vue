<script setup lang="ts">
import { computed } from 'vue';
import usePluginStore from '@/stores/plugin';
import Field from '../Field.vue';

const store = usePluginStore();

const settings = computed(() => store.data!.frame.settings);

const backgroundColors = computed(() => [
  { label: '- None -', value: '' },
  ...Object.keys(store.data!.colors).map((name) => ({ label: name, value: name })),
]);

const versions = ['10.x', '9.x', '8.x', '7.x', '6.x', '5.x'];
const shapeRenderings = ['auto', 'optimizeSpeed', 'crispEdges', 'geometricPrecision'];
</script>

<template>
  <Field label="Title">
    <InputText v-model="settings.title" fluid size="small" />
  </Field>
  <Field label="DiceBear version">
    <Select
      v-model="settings.dicebearVersion"
      :options="versions"
      fluid
      size="small"
    />
  </Field>
  <Field label="Background Color">
    <Select
      v-model="settings.backgroundColorGroupName"
      :options="backgroundColors"
      option-label="label"
      option-value="value"
      fluid
      size="small"
    />
  </Field>
  <Field label="Shape Rendering">
    <Select
      v-model="settings.shapeRendering"
      :options="shapeRenderings"
      fluid
      size="small"
    />
  </Field>
  <Field label="Precision">
    <InputNumber
      v-model="settings.precision"
      :min="0"
      :max="8"
      fluid
      size="small"
    />
  </Field>
</template>
