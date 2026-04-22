export function postPluginMessage(type: string, data?: unknown): void {
  parent.postMessage({ pluginMessage: { type, data } }, '*');
}
