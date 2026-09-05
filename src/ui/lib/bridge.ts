import type { PluginEvent, PluginToUiMessage, RequestMap, RequestType, UiEvent } from '@shared/messages';

type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void };

const pending = new Map<number, Pending>();
let nextRequestId = 1;

export function postEvent(event: UiEvent): void {
  parent.postMessage({ pluginMessage: event }, '*');
}

/** Sends a request to the sandbox and resolves with its typed reply. */
export function request<K extends RequestType>(
  type: K,
  params: RequestMap[K]['params'],
): Promise<RequestMap[K]['result']> {
  const requestId = nextRequestId++;

  // Opened outside Figma, for a look at the window: nothing answers, so a
  // request fails right away instead of hanging.
  if (parent === window) {
    return Promise.reject(new Error('The plugin window is not running inside Figma.'));
  }

  return new Promise((resolve, reject) => {
    pending.set(requestId, { resolve: resolve as (value: unknown) => void, reject });
    parent.postMessage({ pluginMessage: { type, requestId, params } }, '*');
  });
}

/**
 * Installs the one listener for sandbox messages. Replies settle their
 * request, everything else goes to `onEvent`. Returns the uninstaller.
 */
export function installBridge(onEvent: (event: PluginEvent) => void): () => void {
  const listener = (event: MessageEvent) => {
    const message = event.data?.pluginMessage as PluginToUiMessage | undefined;

    if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
      return;
    }

    if (message.type === 'reply') {
      const entry = pending.get(message.requestId);

      if (!entry) {
        return;
      }

      pending.delete(message.requestId);

      if (message.ok) {
        entry.resolve(message.result);
      } else {
        entry.reject(new Error(message.message));
      }

      return;
    }

    onEvent(message);
  };

  window.addEventListener('message', listener);

  return () => window.removeEventListener('message', listener);
}
