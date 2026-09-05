import { Frame } from 'lucide-react';
import { DisabledButton } from '@/components/DisabledButton';
import { useFileInput } from '@/hooks/useFileInput';
import { useAppStore } from '@/store';
import { importDefinitionFile } from './lib/importFile';

/** Which frame the Style tools work on, and the way to import a definition. */
export function StyleTopBar() {
  const status = useAppStore((state) => state.style.status);
  const importBlocked = useAppStore((state) => state.style.importBlocked);
  const file = useFileInput(importDefinitionFile);

  const hint =
    status === 'none' ? 'Select a layer inside a square frame, or import a definition into an empty file.' : null;

  return (
    <div className="border-b">
      <div className="flex items-center gap-2 px-3 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Frame className="size-4 text-icon-secondary" />
        </span>
        <input ref={file.ref} type="file" accept=".json,application/json" className="hidden" onChange={file.onChange} />
        <DisabledButton
          variant="outline"
          className="flex-1"
          reason={importBlocked}
          tooltipSide="bottom"
          disabled={status === 'loading'}
          onClick={file.open}
        >
          Import definition
        </DisabledButton>
      </div>
      {hint && <p className="border-t px-3 py-3 text-muted-foreground [text-wrap:pretty]">{hint}</p>}
    </div>
  );
}
