import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Props = ComponentProps<typeof Button> & {
  /** Why the button does nothing right now; the button is live when null. */
  reason: ReactNode | null;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
};

/**
 * A button that explains itself while disabled. A disabled button receives
 * no pointer events, so the tooltip listens on a span around it.
 */
export function DisabledButton({ reason, tooltipSide = 'top', className, ...props }: Props) {
  if (reason === null) {
    return <Button className={className} {...props} />;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className}>
          <Button className="w-full" {...props} disabled />
        </span>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide} className="max-w-64">
        {reason}
      </TooltipContent>
    </Tooltip>
  );
}
