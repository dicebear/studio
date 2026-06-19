<script setup lang="ts">
import { reactive } from 'vue';
import { isValidVariantTag, MAX_VARIANT_TAGS } from '@/utils/sanitizeSettings';

const props = defineProps<{
  values: Record<string, string[]>;
  options: readonly string[];
}>();

// Per-variant draft text for the tag currently being typed. A commit that hits
// a malformed token leaves it in the draft so the user can see and fix it.
const drafts = reactive<Record<string, string>>({});

function list(name: string): string[] {
  return (props.values[name] ??= []);
}

function commit(name: string): void {
  const tokens = (drafts[name] ?? '')
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    drafts[name] = '';

    return;
  }

  const tags = list(name);
  const invalid: string[] = [];

  for (const token of tokens) {
    if (!isValidVariantTag(token)) {
      invalid.push(token);
    } else if (tags.length < MAX_VARIANT_TAGS && !tags.includes(token)) {
      tags.push(token);
    }
    // A duplicate or an over-the-cap token is dropped silently: the existing
    // chip, or the already-full row, explains why.
  }

  // Malformed tokens stay in the input so the user can see and correct them.
  drafts[name] = invalid.join(', ');
}

function remove(name: string, tag: string): void {
  const tags = list(name);
  const index = tags.indexOf(tag);

  if (index !== -1) {
    tags.splice(index, 1);
  }
}

function onKeydown(name: string, event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault();
    commit(name);

    return;
  }

  // Backspace on an empty input removes the last chip, like a typical tag
  // field. Ignore key-repeat so a held key removes one chip per press.
  if (event.key === 'Backspace' && !event.repeat && (drafts[name] ?? '') === '') {
    const tags = list(name);

    if (tags.length > 0) {
      tags.splice(tags.length - 1, 1);
    }
  }
}
</script>

<template>
  <div class="tag-list">
    <div v-for="name in options" :key="name" class="tag-row">
      <span class="tag-label">{{ name }}</span>
      <div class="tag-control">
        <span v-for="tag in values[name] ?? []" :key="tag" class="tag-chip">
          {{ tag }}
          <button type="button" class="tag-remove" :aria-label="`Remove ${tag}`" @click="remove(name, tag)">×</button>
        </span>
        <input
          v-model="drafts[name]"
          type="text"
          class="tag-input"
          :placeholder="(values[name]?.length ?? 0) === 0 ? 'mood:happy' : ''"
          @keydown="onKeydown(name, $event)"
          @blur="commit(name)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tag-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tag-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 11px;
}

.tag-label {
  color: var(--figma-color-text);
  flex: 0 0 30%;
  padding-top: 6px;
}

.tag-control {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  min-height: 28px;
  padding: 3px 6px;
  border: 1px solid var(--figma-color-border);
  border-radius: 4px;
  background-color: var(--figma-color-bg);
}

.tag-control:focus-within {
  border-color: var(--figma-color-border-selected);
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 2px 1px 6px;
  border-radius: 4px;
  background-color: var(--figma-color-bg-secondary);
  color: var(--figma-color-text);
  font-variant-numeric: tabular-nums;
}

.tag-remove {
  border: none;
  background: transparent;
  color: var(--figma-color-text-secondary);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  padding: 0 2px;
}

.tag-remove:hover {
  color: var(--figma-color-text);
}

.tag-input {
  flex: 1;
  min-width: 80px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--figma-color-text);
  font-size: 11px;
}

.tag-input:focus {
  outline: none;
}
</style>
