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
      break;

    case 'loaded':
      store.type = 'loaded';
      store.data = message.data;
      break;

    case 'error':
      store.type = 'error';
      store.message = message.data.message;
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
