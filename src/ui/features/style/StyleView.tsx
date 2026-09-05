import { useEffect } from 'react';
import { postEvent, request } from '@/lib/bridge';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { WarningsPanel } from '@/components/WarningsPanel';
import { Workspace } from '@/components/Workspace';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/store';
import { StyleEmptyState } from './StyleEmptyState';
import { StyleFooter } from './StyleFooter';
import { StyleSidebar, StyleStage } from './StyleWorkspace';
import { StyleTopBar } from './StyleTopBar';

export function StyleView() {
  const status = useAppStore((state) => state.style.status);
  const message = useAppStore((state) => state.style.message);
  const progress = useAppStore((state) => state.progress);
  const warnings = useAppStore((state) => state.style.warnings);
  const setWarnings = useAppStore((state) => state.setWarnings);

  // The tab opens on whatever the sandbox knows, which may be nothing yet.
  useEffect(() => {
    if (useAppStore.getState().style.status === 'idle') {
      postEvent({ type: 'style:refresh' });
    }
  }, []);

  // Whether the file can take an import changes with the file, so it is
  // asked again whenever the style state settles.
  useEffect(() => {
    if (status !== 'loaded' && status !== 'none') {
      return;
    }

    let stale = false;

    request('import:check', {})
      .then(({ blocked }) => {
        if (!stale) {
          useAppStore.getState().setImportBlocked(blocked);
        }
      })
      .catch(() => undefined);

    return () => {
      stale = true;
    };
  }, [status]);

  return (
    <Workspace
      sidebar={
        // While the sandbox reads the frame there is nothing to put in the column.
        status === 'loaded' || status === 'none' ? (
          <ScrollArea className="h-full">
            <StyleTopBar />
            {status === 'loaded' && <StyleSidebar />}
          </ScrollArea>
        ) : undefined
      }
      notices={
        <WarningsPanel
          sections={[
            { title: 'Import warnings', items: warnings.import, onDismiss: () => setWarnings('import', []) },
            { title: 'Export warnings', items: warnings.export, onDismiss: () => setWarnings('export', []) },
          ]}
        />
      }
      footer={<StyleFooter />}
    >
      {status === 'loaded' ? (
        <ScrollArea className="h-full">
          <StyleStage />
        </ScrollArea>
      ) : (
        <div className="flex min-h-0 flex-1">
          {status === 'none' && <StyleEmptyState />}
          {status === 'error' && (
            <ErrorState message={message} actionLabel="Retry" onAction={() => postEvent({ type: 'style:refresh' })} />
          )}
          {(status === 'idle' || status === 'loading') && (
            <LoadingState message={progress?.message} fraction={progress?.fraction ?? null} />
          )}
        </div>
      )}
    </Workspace>
  );
}
