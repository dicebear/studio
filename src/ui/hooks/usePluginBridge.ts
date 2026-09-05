import { useEffect } from 'react';
import { installBridge, postEvent } from '@/lib/bridge';
import { handlePluginEvent } from '@/lib/messageHandler';
import { persistGenerateSettings } from '@/lib/persistGenerate';

/** Connects the window to the sandbox for the lifetime of the app. */
export function usePluginBridge(): void {
  useEffect(() => {
    const uninstall = installBridge(handlePluginEvent);
    const stopPersisting = persistGenerateSettings();

    postEvent({ type: 'ui:ready' });

    return () => {
      uninstall();
      stopPersisting();
    };
  }, []);
}
