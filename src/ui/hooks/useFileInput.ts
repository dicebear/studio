import { useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';

/** A hidden file input and the click that opens it. */
export function useFileInput(onFile: (file: File) => void) {
  const ref = useRef<HTMLInputElement | null>(null);

  const open = useCallback(() => ref.current?.click(), []);

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      event.target.value = '';

      if (file) {
        onFile(file);
      }
    },
    [onFile],
  );

  return { ref, open, onChange };
}
