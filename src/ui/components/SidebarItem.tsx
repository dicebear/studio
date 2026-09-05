import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type Props = ComponentProps<'button'> & { active: boolean };

/** One row of a sidebar menu, lit while it is the chosen one. */
export function SidebarItem({ active, className, ...props }: Props) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center rounded-md text-left transition-colors',
        active ? 'bg-selected' : 'hover:bg-accent',
        className,
      )}
      {...props}
    />
  );
}
