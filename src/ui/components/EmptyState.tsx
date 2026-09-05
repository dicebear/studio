import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  icon: ReactNode;
  title: string;
  className?: string;
  children: ReactNode;
};

/** What a tab shows while it has nothing to work on. */
export function EmptyState({ icon, title, className, children }: Props) {
  return (
    <div className={cn('m-auto px-10 py-6 text-center', className)}>
      {icon}
      <h1 className="mt-2.5 mb-1 text-xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}
