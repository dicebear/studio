<script setup lang="ts">
import { computed } from 'vue';
import { useRangeField } from '../composables/useRangeField';
import type { ComponentGroupSettings, RangeValue } from '../types';

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
    defaultSingle: number;
    defaultRange?: readonly number[];
  }>(),
  {
    unit: '',
  },
);

const {
  rangeMode,
  isRangeMode,
  toggleRangeMode,
  singleComputed,
  rangeComputed,
} = useRangeField(props.target);

const initialValue = props.target[props.optionKey];

if (props.defaultRange?.length === 2 && typeof initialValue !== 'number') {
  rangeMode[props.optionKey] = true;
}

const singleVal = singleComputed(props.optionKey, props.defaultSingle);
const rangeVal = rangeComputed(
  props.optionKey,
  props.defaultRange ?? props.defaultSingle,
);

const displayRange = computed<[number, number]>(() => {
  const [a, b] = rangeVal.value;

  return [Math.min(a, b), Math.max(a, b)];
});
</script>

<template>
  <div class="field">
    <div class="field-label">
      <span class="field-label-text">{{ label }}</span>
      <Button
        size="small"
        :severity="isRangeMode(optionKey) ? 'primary' : 'secondary'"
        v-tooltip="isRangeMode(optionKey) ? 'Switch to fixed value' : 'Switch to range'"
        class="field-toggle"
        @click="toggleRangeMode(optionKey, defaultSingle)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m16 3 4 4-4 4" />
          <path d="M20 7H4" />
          <path d="m8 21-4-4 4-4" />
          <path d="M4 17h16" />
        </svg>
      </Button>
      <span v-if="isRangeMode(optionKey)" class="field-value">
        {{ displayRange[0] }}{{ unit }} — {{ displayRange[1] }}{{ unit }}
      </span>
      <span v-else class="field-value">{{ singleVal }}{{ unit }}</span>
    </div>
    <Slider
      v-if="isRangeMode(optionKey)"
      v-model="rangeVal"
      :range="true"
      :min="min"
      :max="max"
      :step="step"
    />
    <Slider
      v-else
      v-model="singleVal"
      :min="min"
      :max="max"
      :step="step"
    />
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

.field-toggle {
  padding: 0 6px !important;
  min-width: 0 !important;
  height: 20px !important;
}
</style>
