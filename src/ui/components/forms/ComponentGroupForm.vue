<script setup lang="ts">
import { computed } from 'vue';
import usePluginStore from '@/stores/plugin';
import { useDefinitionFile } from '@/utils/useDefinitionFile';
import Field from '../Field.vue';
import RangeField from '../RangeField.vue';
import ToggleGroup from '../ToggleGroup.vue';

const props = defineProps<{ componentGroup: string }>();

const store = usePluginStore();

const settings = computed(() => store.data!.components[props.componentGroup].settings);

const isDefinition = computed(() =>
  useDefinitionFile(store.data!.frame.settings.dicebearVersion),
);

const probability = computed<number>({
  get: () => (typeof settings.value.probability === 'number' ? settings.value.probability : 100),
  set: (val: number) => {
    settings.value.probability = val;
  },
});

const defaultsKeys = computed(() => Object.keys(settings.value.defaults));
</script>

<template>
  <div class="field">
    <div class="field-label">
      <span class="field-label-text">Probability (in percent)</span>
      <span class="field-value">{{ probability }}%</span>
    </div>
    <Slider v-model="probability" :min="0" :max="100" :step="1" />
  </div>

  <RangeField
    label="Rotation (in deg)"
    option-key="rotation"
    :target="settings"
    :min="-360"
    :max="360"
    :step="1"
    unit="°"
    :default-single="0"
    :default-range="[0, 0]"
  />

  <RangeField
    label="Translate X (in %)"
    option-key="translateX"
    :target="settings"
    :min="-1000"
    :max="1000"
    :step="1"
    unit="%"
    :default-single="0"
    :default-range="[0, 0]"
  />

  <RangeField
    label="Translate Y (in %)"
    option-key="translateY"
    :target="settings"
    :min="-1000"
    :max="1000"
    :step="1"
    unit="%"
    :default-single="0"
    :default-range="[0, 0]"
  />

  <RangeField
    v-if="isDefinition"
    label="Scale"
    option-key="scale"
    :target="settings"
    :min="0"
    :max="10"
    :step="0.01"
    :default-single="1"
    :default-range="[1, 1]"
  />

  <Field v-if="!isDefinition" label="Defaults">
    <ToggleGroup :values="settings.defaults" :options="defaultsKeys" />
  </Field>
</template>

<style scoped>
.field {
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 2px;
  font-size: 11px;
  font-weight: 600;
  color: var(--figma-color-text);
}

.field-label-text {
  white-space: nowrap;
}

.field-value {
  margin-left: auto;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
