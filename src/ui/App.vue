<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import { saveAs } from 'file-saver';
import usePluginStore from './stores/plugin';
import { createZip } from './utils/createZip';
import { postPluginMessage } from './utils/postPluginMessage';
import Container from './components/Container.vue';
import type { PluginMessage } from './types';

const store = usePluginStore();

async function handleMessage(event: MessageEvent) {
  const message = event.data?.pluginMessage as PluginMessage | undefined;

  if (!message) {
    return;
  }

  switch (message.type) {
    case 'loading':
      store.type = 'loading';
      store.message = message.data?.message ?? '';
      store.progress = typeof message.data?.progress === 'number' ? message.data.progress : null;

      // The plugin waits for this before its next step, so every step gets
      // on screen. The frame callback runs right before the paint that shows
      // the update, and the message reaches the plugin after it. The step
      // number tells the plugin which update was painted.
      if (store.progress !== null) {
        const step = message.data?.step;

        requestAnimationFrame(() => postPluginMessage('progress', { step }));
      }
      break;

    case 'loaded':
      store.type = 'loaded';
      store.data = message.data;
      store.normalize = {};
      store.normalizeErrors = {};
      break;

    case 'normalize':
      store.normalize[message.data.groupName] = message.data;
      delete store.normalizeErrors[message.data.groupName];
      break;

    case 'normalize:error':
      store.normalizeErrors[message.data.groupName] = message.data.message;
      break;

    case 'error':
      store.type = 'error';
      store.message = message.data.message;
      break;

    case 'welcome':
      store.type = 'welcome';
      store.message = '';
      break;

    case 'import:result':
      store.importWarnings = message.data.warnings;
      break;

    case 'export':
      if (message.data.files) {
        const blob = await createZip(message.data.files);

        saveAs(blob, `${message.data.name}.zip`);
      } else if (message.data.content !== undefined) {
        const blob = new Blob([message.data.content], {
          type: 'text/plain;charset=utf-8',
        });

        saveAs(blob, `${message.data.name}.json`);
      }

      store.exportWarnings = message.data.warnings ?? [];

      postPluginMessage('init');
      break;
  }
}

onMounted(() => {
  window.addEventListener('message', handleMessage);
  postPluginMessage('init');
});

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage);
});
</script>

<template>
  <Container />
</template>
