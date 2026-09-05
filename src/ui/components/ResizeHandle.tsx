import type { PointerEvent as ReactPointerEvent } from 'react';
import { MIN_WINDOW } from '@shared/prefs';
import { postEvent } from '@/lib/bridge';

/**
 * The grip in the bottom right corner that resizes the plugin window. The
 * sandbox resizes and remembers, the window only asks, one request per frame.
 */
export function ResizeHandle() {
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const start = { x: event.clientX, y: event.clientY, width: window.innerWidth, height: window.innerHeight };
    let frame: number | null = null;
    let size = { width: start.width, height: start.height };

    const onMove = (move: PointerEvent) => {
      size = {
        width: Math.max(MIN_WINDOW.width, Math.round(start.width + move.clientX - start.x)),
        height: Math.max(MIN_WINDOW.height, Math.round(start.height + move.clientY - start.y)),
      };

      if (frame === null) {
        frame = requestAnimationFrame(() => {
          frame = null;
          postEvent({ type: 'ui:resize', ...size });
        });
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      className="absolute right-0 bottom-0 z-50 size-4 cursor-nwse-resize text-icon-secondary"
      onPointerDown={onPointerDown}
      title="Resize"
    >
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
        <path d="M14 14h-2M14 14v-2M14 10v-1M14 6v-1M10 14H9M6 14H5" stroke="currentColor" strokeLinecap="round" />
      </svg>
    </div>
  );
}
