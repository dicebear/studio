import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function FieldReset({ onClick, label = 'Reset to default' }: { onClick: () => void; label?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-icon-secondary hover:bg-danger hover:text-danger-foreground"
          onClick={onClick}
          aria-label={label}
        >
          <RotateCcw />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
