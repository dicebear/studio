import { ScrollArea } from '@/components/ui/scroll-area';
import { Workspace } from '@/components/Workspace';
import { useAppStore } from '@/store';
import { InspectEmptyState } from './InspectEmptyState';
import { InspectFooter } from './InspectFooter';
import { InspectSidebar } from './InspectSidebar';
import { InspectStage } from './InspectStage';

/** What the selected avatars carry, for handing them to developers. */
export function InspectView() {
  const items = useAppStore((state) => state.selection.avatars);
  const activeId = useAppStore((state) => state.inspectActiveId);
  // The chosen avatar stays while it is selected, then the first one takes over.
  const active = items.find((item) => item.id === activeId) ?? items[0] ?? null;

  return (
    <Workspace
      sidebar={
        items.length > 0 ? (
          <ScrollArea className="h-full">
            <InspectSidebar items={items} activeId={active?.id ?? null} />
          </ScrollArea>
        ) : undefined
      }
      footer={<InspectFooter items={items} active={active} />}
    >
      {active ? (
        <ScrollArea className="h-full">
          <InspectStage key={active.id} item={active} />
        </ScrollArea>
      ) : (
        <InspectEmptyState />
      )}
    </Workspace>
  );
}
