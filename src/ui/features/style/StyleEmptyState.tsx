import { DiceBearMark } from '@/components/DiceBearMark';
import { EmptyState } from '@/components/EmptyState';

export function StyleEmptyState() {
  return (
    <EmptyState
      className="max-w-[560px]"
      icon={<DiceBearMark className="mx-auto size-10 text-foreground" />}
      title="DiceBear Studio"
    >
      <p className="mb-4 text-muted-foreground">Turn a Figma frame into a DiceBear avatar style, and back.</p>
      <div className="flex gap-2 text-left">
        <div className="flex-1 rounded-lg bg-muted p-3">
          <p className="mb-1 font-semibold">Import a style</p>
          <p className="text-muted-foreground">
            Open an empty Figma file and pick a DiceBear definition file with the Import button above.
          </p>
        </div>
        <div className="flex-1 rounded-lg bg-muted p-3">
          <p className="mb-1 font-semibold">Export a style</p>
          <p className="text-muted-foreground">
            Select the square frame that holds your avatar. Its settings and the export appear here right away.
          </p>
        </div>
      </div>
    </EmptyState>
  );
}
