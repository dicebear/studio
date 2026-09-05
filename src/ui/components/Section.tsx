import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  /** Sits at the right end of the title row. */
  aside?: ReactNode;
  /** Menus sit closer together than form rows. */
  gap?: 'normal' | 'tight';
  /** Sidebar sections are padded and ruled, stage sections stand on their own. */
  variant?: 'sidebar' | 'stage';
  children: ReactNode;
};

/** One titled block of a sidebar or a stage. */
export function Section({ title, aside, gap = 'normal', variant = 'sidebar', children }: Props) {
  return (
    <section
      className={cn(
        'flex flex-col',
        gap === 'tight' ? 'gap-0.5' : 'gap-2',
        variant === 'sidebar' ? 'border-b px-3 py-3 last:border-b-0' : 'mb-4',
      )}
    >
      <div className={cn('flex items-center gap-2', variant === 'sidebar' ? 'h-5' : 'h-6')}>
        <h2 className="font-semibold">{title}</h2>
        <span className="flex-1" />
        {aside}
      </div>
      {children}
    </section>
  );
}
