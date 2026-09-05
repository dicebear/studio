import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isDefaultSnapshot, useGenerateStore } from '@/store/generate';

/** The sidebar's title row with the reset for everything below it. */
export function SidebarHeader() {
  const resetSettings = useGenerateStore((state) => state.resetSettings);
  const untouched = useGenerateStore(isDefaultSnapshot);

  return (
    <div className="flex h-9 items-center border-b px-3">
      <span className="font-semibold">Settings</span>
      <span className="flex-1" />
      <Button variant="ghost" size="xs" disabled={untouched} onClick={resetSettings}>
        <RotateCcw /> Reset
      </Button>
    </div>
  );
}
