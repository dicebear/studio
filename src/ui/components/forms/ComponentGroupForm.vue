<script setup lang="ts">
import { computed, watch } from 'vue';
import usePluginStore from '@/stores/plugin';
import { useDefinitionFile } from '@/utils/useDefinitionFile';
import { postPluginMessage } from '@/utils/postPluginMessage';
import { isClose, isVariantAligned } from '@/utils/normalize';
import Field from '../Field.vue';
import FieldReset from '../FieldReset.vue';
import RangeField from '../RangeField.vue';
import ToggleGroup from '../ToggleGroup.vue';
import WeightGroup from '../WeightGroup.vue';

const props = defineProps<{ componentGroup: string }>();

const store = usePluginStore();

const group = computed(() => store.data!.components[props.componentGroup]);
const settings = computed(() => group.value.settings);
const extendsGroup = computed(() => group.value.extendsGroup);

const isDefinition = computed(() => useDefinitionFile(store.data!.frame.settings.dicebearVersion));

const precision = computed(() => store.data!.frame.settings.precision);

function formatNumber(value: number): string {
  return (+value.toFixed(precision.value)).toString();
}

const probability = computed<number>({
  get: () => (typeof settings.value.probability === 'number' ? settings.value.probability : 100),
  set: (val: number) => {
    settings.value.probability = val;
  },
});

const usedByAliases = computed<string[]>(() => {
  const list: string[] = [];

  for (const [name, g] of Object.entries(store.data!.components)) {
    if (g.extendsGroup === props.componentGroup) {
      list.push(name);
    }
  }

  return list.sort();
});

const aliasInstanceIds = computed<string[]>(() => group.value.aliasInstanceIds ?? []);

function revealAliasInstances() {
  if (aliasInstanceIds.value.length === 0) {
    return;
  }

  postPluginMessage('reveal:instances', { ids: [...aliasInstanceIds.value] });
}

const defaultsKeys = computed(() => Object.keys(settings.value.defaults));

const weightsKeys = computed(() => Object.keys(settings.value.weights));

const hasNonDefaultWeights = computed(() => weightsKeys.value.some((k) => settings.value.weights[k] !== 1));

function resetWeights(): void {
  for (const key of weightsKeys.value) {
    settings.value.weights[key] = 1;
  }
}

const tab = computed({
  get: () => {
    if (store.componentTab === 'weights' && !isDefinition.value) {
      return 'settings';
    }

    return store.componentTab;
  },
  set: (next: 'settings' | 'weights' | 'normalize') => {
    store.componentTab = next;
  },
});

const normalizeData = computed(() => store.normalize[props.componentGroup]);
const normalizeError = computed(() => store.normalizeErrors[props.componentGroup]);

function fetchNormalize() {
  postPluginMessage('prepare:normalize', { groupName: props.componentGroup });
}

watch(
  () => [tab.value, props.componentGroup] as const,
  ([nextTab]) => {
    if (nextTab !== 'normalize' || extendsGroup.value) {
      return;
    }

    // Always re-fetch when entering the tab. Figma may have been edited
    // since the last prepare and stale cache would mislead the preview.
    fetchNormalize();
  },
  { immediate: true },
);

function statusFor(
  v: NonNullable<typeof normalizeData.value>['variants'][number],
  data: NonNullable<typeof normalizeData.value>,
): string {
  if (v.skipReason === 'auto-layout') {
    return 'skipped: auto-layout';
  }

  if (v.skipReason === 'no-children') {
    return 'skipped: empty';
  }

  if (isVariantAligned(v, data)) {
    return 'already aligned';
  }

  const sizeMatches = isClose(v.currentWidth, data.targetWidth) && isClose(v.currentHeight, data.targetHeight);

  return sizeMatches ? 'will shift' : 'will resize';
}

const groupTranslateActive = computed(() => {
  const n = normalizeData.value;

  return n ? !isClose(n.willTranslate.dx, 0) || !isClose(n.willTranslate.dy, 0) : false;
});

function onRetry() {
  delete store.normalizeErrors[props.componentGroup];
  fetchNormalize();
}
</script>

<template>
  <div v-if="extendsGroup" class="alias-banner">
    <p>
      Alias of <strong>{{ extendsGroup }}</strong
      >. Variants, dimensions, and transforms are inherited from the source. Aliases have no own settings.
    </p>
    <p>
      This alias exists because at least one instance in Figma is renamed to <strong>{{ componentGroup }}</strong
      >. To remove it, rename those instances back to the <strong>{{ extendsGroup }}</strong> group or revert the rename
      in Figma.
    </p>
    <button v-if="aliasInstanceIds.length > 0" type="button" class="alias-banner-action" @click="revealAliasInstances">
      Show
      {{ aliasInstanceIds.length }}
      renamed instance{{ aliasInstanceIds.length === 1 ? '' : 's' }} in Figma
    </button>
  </div>

  <template v-else>
    <div v-if="usedByAliases.length > 0" class="alias-banner">
      Used by
      <template v-for="(name, i) in usedByAliases" :key="name"
        ><strong>{{ name }}</strong
        ><template v-if="i < usedByAliases.length - 1">, </template></template
      >. Changes propagate to those aliases.
    </div>

    <div class="tab-strip">
      <button type="button" class="tab" :class="{ active: tab === 'settings' }" @click="tab = 'settings'">
        Settings
      </button>
      <button
        v-if="isDefinition"
        type="button"
        class="tab"
        :class="{ active: tab === 'weights' }"
        @click="tab = 'weights'"
      >
        Weights
      </button>
      <button type="button" class="tab" :class="{ active: tab === 'normalize' }" @click="tab = 'normalize'">
        Normalize
      </button>
    </div>

    <template v-if="tab === 'settings'">
      <div class="field">
        <div class="field-label">
          <span class="field-label-text">Probability (in percent)</span>
          <FieldReset v-if="settings.probability !== null" @click="settings.probability = null" />
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
        :default-value="0"
        :with-step="isDefinition"
      />

      <RangeField
        label="Translate X (in %)"
        option-key="translateX"
        :target="settings"
        :min="-1000"
        :max="1000"
        :step="1"
        unit="%"
        :default-value="0"
        :with-step="isDefinition"
      />

      <RangeField
        label="Translate Y (in %)"
        option-key="translateY"
        :target="settings"
        :min="-1000"
        :max="1000"
        :step="1"
        unit="%"
        :default-value="0"
        :with-step="isDefinition"
      />

      <RangeField
        v-if="isDefinition"
        label="Scale"
        option-key="scale"
        :target="settings"
        :min="0"
        :max="10"
        :step="0.01"
        :default-value="1"
        :with-step="isDefinition"
      />

      <Field v-if="!isDefinition" label="Defaults">
        <ToggleGroup :values="settings.defaults" :options="defaultsKeys" />
      </Field>
    </template>

    <template v-else-if="tab === 'weights'">
      <p class="weights-summary">
        Higher values make a variant more likely to be picked. Default
        <strong>1</strong>; <strong>0</strong> means never selected unless every variant is 0. Range 0–1,000,000.
      </p>

      <div class="field">
        <div class="field-label">
          <span class="field-label-text">Weights</span>
          <FieldReset v-if="hasNonDefaultWeights" @click="resetWeights" />
        </div>
        <WeightGroup :values="settings.weights" :options="weightsKeys" />
      </div>
    </template>

    <template v-else>
      <div v-if="normalizeError" class="normalize-error">
        <p>{{ normalizeError }}</p>
        <button type="button" class="retry" @click="onRetry">Retry</button>
      </div>

      <div v-else-if="!normalizeData" class="normalize-loading">Loading variants…</div>

      <template v-else>
        <p class="normalize-summary">
          Target frame size:
          <strong>
            {{ formatNumber(normalizeData.targetWidth) }} ×
            {{ formatNumber(normalizeData.targetHeight) }}
          </strong>
          (content-aware trim). Instances are repositioned so the visual stays put.
        </p>
        <p v-if="groupTranslateActive" class="normalize-summary">
          All children shift by
          <strong>
            {{ formatNumber(normalizeData.willTranslate.dx) }},
            {{ formatNumber(normalizeData.willTranslate.dy) }} </strong
          >; frames and instances shift in the opposite direction.
        </p>

        <table class="variants">
          <thead>
            <tr>
              <th>Variant</th>
              <th>Frame</th>
              <th>Content</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in normalizeData.variants" :key="v.name" :class="{ skipped: !!v.skipReason }">
              <td>{{ v.name }}</td>
              <td>
                {{ formatNumber(v.currentWidth) }} ×
                {{ formatNumber(v.currentHeight) }}
              </td>
              <td>
                <template v-if="!v.skipReason">
                  {{ formatNumber(v.contentWidth) }} ×
                  {{ formatNumber(v.contentHeight) }}
                </template>
                <template v-else>—</template>
              </td>
              <td>{{ statusFor(v, normalizeData) }}</td>
            </tr>
          </tbody>
        </table>

        <p v-if="normalizeData.instanceCount > 0" class="instances">
          <strong>{{ normalizeData.instanceCount }}</strong> instance{{ normalizeData.instanceCount === 1 ? '' : 's' }}
          will be repositioned to keep visuals stable.
        </p>
        <p v-else class="instances muted">No instances of this group found.</p>

        <p v-if="normalizeData.lockedInstanceCount > 0" class="instances locked">
          <strong>{{ normalizeData.lockedInstanceCount }}</strong> nested instance{{
            normalizeData.lockedInstanceCount === 1 ? '' : 's'
          }}
          will be skipped because they live inside another component or auto-layout and Figma doesn't allow overriding their
          position. Visuals there will shift; fix the surrounding components manually.
        </p>
      </template>
    </template>
  </template>
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

.alias-banner {
  margin-bottom: 12px;
  padding: 8px 12px;
  border: 1px solid var(--figma-color-border);
  border-radius: 4px;
  font-size: 11px;
  color: var(--figma-color-text-secondary);
  background-color: var(--figma-color-bg-secondary);
}

.alias-banner p {
  margin: 0;
  line-height: 1.4;
}

.alias-banner > *:not(:first-child) {
  margin-top: 6px;
}

.alias-banner strong {
  color: var(--figma-color-text);
  font-weight: 600;
}

.alias-banner-action {
  height: 24px;
  padding: 0 10px;
  border: 1px solid var(--figma-color-border);
  border-radius: 4px;
  background-color: var(--figma-color-bg);
  color: var(--figma-color-text);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
}

.alias-banner-action:hover {
  background-color: var(--figma-color-bg-hover);
}

.tab-strip {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--figma-color-border);
}

.tab {
  height: 28px;
  padding: 0 10px;
  border: none;
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  color: var(--figma-color-text-secondary);
  cursor: pointer;
  position: relative;
  transition: color 120ms ease;
}

.tab:hover {
  color: var(--figma-color-text);
}

.tab.active {
  color: var(--figma-color-text);
}

.tab.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background-color: var(--figma-color-text);
}

.normalize-summary,
.weights-summary {
  font-size: 11px;
  color: var(--figma-color-text-secondary);
  line-height: 1.5;
  margin-bottom: 12px;
}

.normalize-summary strong,
.weights-summary strong {
  color: var(--figma-color-text);
}

.variants {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  margin-bottom: 12px;
}

.variants th,
.variants td {
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid var(--figma-color-border);
}

.variants th {
  font-weight: 600;
  color: var(--figma-color-text-secondary);
  background-color: var(--figma-color-bg-secondary);
}

.variants tr.skipped {
  color: var(--figma-color-text-secondary);
  opacity: 0.7;
}

.instances {
  font-size: 11px;
  padding: 10px 12px;
  background-color: var(--figma-color-bg-tertiary);
  border-radius: 4px;
  margin-bottom: 12px;
}

.instances.muted {
  background-color: transparent;
  color: var(--figma-color-text-secondary);
  padding-left: 0;
}

.instances.locked {
  background-color: var(--figma-color-bg-warning-tertiary);
  color: var(--figma-color-text-warning);
  border: 1px solid var(--figma-color-border-warning);
}

.instances.locked strong {
  color: var(--figma-color-text-warning);
}

.normalize-loading {
  font-size: 11px;
  color: var(--figma-color-text-secondary);
  padding: 16px 0;
}

.normalize-error {
  padding: 10px 12px;
  border: 1px solid var(--figma-color-border-danger);
  background-color: var(--figma-color-bg-danger-tertiary);
  color: var(--figma-color-text-danger);
  border-radius: 4px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.normalize-error p {
  flex: 1;
}

.retry {
  border: 1px solid var(--figma-color-border-danger);
  background: transparent;
  color: var(--figma-color-text-danger);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
}
</style>
