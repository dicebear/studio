import { errorMessage } from '@shared/errors';
import type { PluginEvent, RequestMap, RequestType, Reply, UiEvent, UiToPluginMessage } from '@shared/messages';

type RequestHandler<K extends RequestType> = (params: RequestMap[K]['params']) => Promise<RequestMap[K]['result']>;
type EventHandler<K extends UiEvent['type']> = (event: Extract<UiEvent, { type: K }>) => void | Promise<void>;

type AnyRequestHandler = (params: unknown) => Promise<unknown>;
type AnyEventHandler = (event: UiEvent) => void | Promise<void>;

const requestHandlers = new Map<string, AnyRequestHandler>();
const eventHandlers = new Map<string, AnyEventHandler>();

export function postEvent(event: PluginEvent): void {
  figma.ui.postMessage(event);
}

function postReply(reply: Reply): void {
  figma.ui.postMessage(reply);
}

export function onRequest<K extends RequestType>(type: K, handler: RequestHandler<K>): void {
  requestHandlers.set(type, handler as unknown as AnyRequestHandler);
}

export function onEvent<K extends UiEvent['type']>(type: K, handler: EventHandler<K>): void {
  eventHandlers.set(type, handler as unknown as AnyEventHandler);
}

/**
 * Routes every message from the window. A request is answered exactly once,
 * with the handler's result or its error message. An event without a handler
 * is dropped, which keeps an old window build from crashing a new sandbox.
 */
export function installBridge(): void {
  figma.ui.onmessage = async (msg: UiToPluginMessage) => {
    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
      return;
    }

    if ('requestId' in msg) {
      const handler = requestHandlers.get(msg.type);

      if (!handler) {
        postReply({ type: 'reply', requestId: msg.requestId, ok: false, message: `Unknown request "${msg.type}".` });

        return;
      }

      try {
        postReply({ type: 'reply', requestId: msg.requestId, ok: true, result: await handler(msg.params) });
      } catch (e) {
        postReply({
          type: 'reply',
          requestId: msg.requestId,
          ok: false,
          message: errorMessage(e),
        });
      }

      return;
    }

    const handler = eventHandlers.get(msg.type);

    if (handler) {
      try {
        await handler(msg);
      } catch (e) {
        console.error(`Failed to handle "${msg.type}":`, e);
      }
    }
  };
}
