import { TooltipProvider } from '@/components/ui/tooltip';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { Rail } from '@/components/Rail';
import { ResizeHandle } from '@/components/ResizeHandle';
import { usePluginBridge } from '@/hooks/usePluginBridge';
import { useAppStore } from '@/store';
import { GenerateView } from '@/features/generate/GenerateView';
import { StyleView } from '@/features/style/StyleView';

export function App() {
  usePluginBridge();

  const mode = useAppStore((state) => state.mode);

  return (
    <TooltipProvider delayDuration={400}>
      <AppErrorBoundary>
        <div className="relative flex h-full">
          <Rail />
          <div className="flex min-w-0 flex-1 flex-col">{mode === 'generate' ? <GenerateView /> : <StyleView />}</div>
          <ResizeHandle />
        </div>
      </AppErrorBoundary>
    </TooltipProvider>
  );
}
