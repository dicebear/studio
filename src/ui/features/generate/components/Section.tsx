import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  /** Sits at the right end of the title row. */
  aside?: ReactNode;
  /** Menus sit closer together than form rows. */
  gap?: 'normal' | 'tight';
  children: ReactNode;
};

/** One block of a sidebar. */
export function Section({ title, aside, gap = 'normal', children }: Props) {
  return (
    <section className={cn('flex flex-col border-b px-3 py-3 last:border-b-0', gap === 'tight' ? 'gap-0.5' : 'gap-2')}>
      <div className="flex h-5 items-center">
        <h2 className="font-semibold">{title}</h2>
        <span className="flex-1" />
        {aside}
      </div>
      {children}
    </section>
  );
}
