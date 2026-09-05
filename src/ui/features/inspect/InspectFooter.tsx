import type { InspectItem } from '@shared/messages';
import { DisabledButton } from '@/components/DisabledButton';
import { request } from '@/lib/bridge';

export function InspectFooter({ items, active }: { items: InspectItem[]; active: InspectItem | null }) {
  const status =
    items.length === 0
      ? 'No generated avatar selected'
      : `${items.length} avatar${items.length === 1 ? '' : 's'} selected`;

  return (
    <>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{status}</span>
      <DisabledButton
        size="sm"
        variant="outline"
        reason={active ? null : 'Select a generated avatar first.'}
        onClick={() => active && request('canvas:reveal', { ids: [active.id] }).catch(() => undefined)}
      >
        Show on canvas
      </DisabledButton>
    </>
  );
}
