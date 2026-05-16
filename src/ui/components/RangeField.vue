<script setup lang="ts">
import { computed } from 'vue';
import { useRangeField } from '../composables/useRangeField';
import type { ComponentGroupSettings, RangeValue } from '../types';
import FieldReset from './FieldReset.vue';

type RangeKey = {
  [K in keyof ComponentGroupSettings]: ComponentGroupSettings[K] extends RangeValue
    ? K
    : never;
}[keyof ComponentGroupSettings];

const props = withDefaults(
  defineProps<{
    label: string;
    optionKey: RangeKey & string;
    target: ComponentGroupSettings;
    min: number;
    max: number;
    step: number;
    unit?: string;
    defaultValue: number;
    withStep?: boolean;
  }>(),
  {
    unit: '',
    withStep: false,
  },
);

const { resetRangeField, rangeComputed, stepComputed } = useRangeField(props.target);

const rangeVal = rangeComputed(props.optionKey, () => props.defaultValue);
const stepVal = stepComputed(props.optionKey);

const displayRange = computed<[number, number]>(() => {
  const [a, b] = rangeVal.value;

  return [Math.min(a, b), Math.max(a, b)];
});
</script>

<template>
  <div class="field">
    <div class="field-label">
      <span class="field-label-text">{{ label }}</span>
      <FieldReset
        v-if="target[optionKey] !== null"
        @click="resetRangeField(optionKey)"
      />
      <span class="field-value">
        {{ displayRange[0] }}{{ unit }} — {{ displayRange[1] }}{{ unit }}
      </span>
    </div>
    <Slider
      v-model="rangeVal"
      :range="true"
      :min="min"
      :max="max"
      :step="step"
    />
    <label v-if="withStep" class="step-row">
      <span class="step-label">Step</span>
      <input
        v-model.lazy.number="stepVal"
        type="number"
        :min="0"
        :max="Math.abs(max - min)"
        step="any"
        placeholder="no step"
        class="step-input"
      />
      <span class="step-unit">{{ unit }}</span>
    </label>
  </div>
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

.step-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--figma-color-text-secondary);
}

.step-label {
  flex: 1;
  color: var(--figma-color-text);
}

.step-input {
  width: 80px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--figma-color-border);
  border-radius: 4px;
  background-color: var(--figma-color-bg);
  color: var(--figma-color-text);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.step-input:focus {
  outline: none;
  border-color: var(--figma-color-border-selected);
}

.step-unit {
  width: 14px;
  text-align: left;
  color: var(--figma-color-text-secondary);
}
</style>
