<script setup lang="ts">
import { computed } from 'vue';
import usePluginStore from '@/stores/plugin';
import Field from '../Field.vue';

const store = usePluginStore();

const settings = computed(() => store.data!.frame.settings);
</script>

<template>
  <Field label="onPreCreateHook">
    <Textarea v-model="settings.onPreCreateHook" class="hook-editor" rows="10" spellcheck="false" fluid />
  </Field>
  <Field label="onPostCreateHook">
    <Textarea v-model="settings.onPostCreateHook" class="hook-editor" rows="10" spellcheck="false" fluid />
  </Field>
</template>

<style scoped>
.hook-editor {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
}
</style>
