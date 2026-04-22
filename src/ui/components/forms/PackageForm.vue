<script setup lang="ts">
import { computed } from 'vue';
import usePluginStore from '@/stores/plugin';
import Field from '../Field.vue';

const store = usePluginStore();

const settings = computed(() => store.data!.frame.settings);
</script>

<template>
  <Field label="Title">
    <InputText v-model="settings.title" fluid size="small" />
  </Field>
  <Field label="Package Name">
    <InputText v-model="settings.packageName" fluid size="small" />
  </Field>
  <Field label="Package Version">
    <InputText v-model="settings.packageVersion" fluid size="small" />
  </Field>
  <Field label="File Share URL">
    <InputText
      v-model="settings.fileShareUrl"
      placeholder="https://www.figma.com/file/YHb4ShTgmO8Lqhkz1plLfL"
      fluid
      size="small"
    />
  </Field>
</template>
