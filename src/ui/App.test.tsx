import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

function sendFromPlugin(message: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data: { pluginMessage: message } }));
  });
}

describe('App', () => {
  it('greets the sandbox and opens on the Generate tab', async () => {
    const posted = vi.spyOn(window.parent, 'postMessage');

    render(<App />);

    expect(posted).toHaveBeenCalledWith({ pluginMessage: { type: 'ui:ready', mode: 'generate' } }, '*');

    sendFromPlugin({
      type: 'plugin:init',
      prefs: { mode: 'generate', window: { width: 780, height: 560 }, lastStyleKey: null },
      selection: { targets: [], selectedCount: 0, bounds: null },
      command: null,
      relaunch: null,
      fileSettings: null,
    });

    expect(screen.getByRole('button', { name: 'Generate' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Choose a style' })).toBeInTheDocument();
  });
});
