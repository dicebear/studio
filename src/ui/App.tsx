import type { ComponentType } from 'react';
import type { Mode } from '@shared/messages';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { Rail } from '@/components/Rail';
import { ResizeHandle } from '@/components/ResizeHandle';
import { usePluginBridge } from '@/hooks/usePluginBridge';
import { useAppStore } from '@/store';
import { GenerateView } from '@/features/generate/GenerateView';
import { StyleView } from '@/features/style/StyleView';
import { InspectView } from '@/features/inspect/InspectView';

const VIEWS: Record<Mode, ComponentType> = { generate: GenerateView, inspect: InspectView, style: StyleView };

export function App() {
  usePluginBridge();

  const View = VIEWS[useAppStore((state) => state.mode)];

  return (
    <TooltipProvider delayDuration={400}>
      <AppErrorBoundary>
        <div className="relative flex h-full">
          <Rail />
          <div className="flex min-w-0 flex-1 flex-col">
            <View />
          </div>
          <ResizeHandle />
        </div>
      </AppErrorBoundary>
    </TooltipProvider>
  );
}
