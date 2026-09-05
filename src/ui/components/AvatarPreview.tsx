import { memo } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  /** The avatar as a data URI. */
  src: string;
  title?: string;
  className?: string;
  onClick?: () => void;
};

export const AvatarPreview = memo(function AvatarPreview({ src, title, className, onClick }: Props) {
  const image = <img src={src} alt={title ?? ''} className="size-full" draggable={false} />;

  if (onClick) {
    return (
      <button
        type="button"
        title={title}
        className={cn(
          'overflow-hidden rounded-md bg-muted outline-none hover:inset-ring-2 hover:inset-ring-ring/50 focus-visible:inset-ring-2 focus-visible:inset-ring-ring',
          className,
        )}
        onClick={onClick}
      >
        {image}
      </button>
    );
  }

  return (
    <div title={title} className={cn('overflow-hidden rounded-md bg-muted', className)}>
      {image}
    </div>
  );
});
