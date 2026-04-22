<script setup lang="ts">
import { computed } from 'vue';
import usePluginStore from '@/stores/plugin';
import { useDefinitionFile } from '@/utils/useDefinitionFile';
import Field from '../Field.vue';

const store = usePluginStore();

const settings = computed(() => store.data!.frame.settings);
const isDefinition = computed(() => useDefinitionFile(settings.value.dicebearVersion));
</script>

<template>
  <Field label="Source Title">
    <InputText v-model="settings.sourceTitle" fluid size="small" />
  </Field>
  <Field label="Source URL">
    <InputText v-model="settings.source" fluid size="small" />
  </Field>
  <Field label="Creator">
    <InputText v-model="settings.creator" fluid size="small" />
  </Field>
  <Field label="Homepage URL">
    <InputText v-model="settings.homepage" fluid size="small" />
  </Field>
  <Field label="License Name">
    <InputText v-model="settings.licenseName" fluid size="small" />
  </Field>
  <Field label="License URL">
    <InputText v-model="settings.licenseUrl" fluid size="small" />
  </Field>
  <Field v-if="isDefinition" label="License Text">
    <Textarea v-model="settings.licenseText" rows="6" fluid />
  </Field>
</template>
