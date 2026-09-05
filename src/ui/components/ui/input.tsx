import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  'w-full min-w-0 rounded-lg border border-input bg-transparent transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none',
  {
    variants: {
      size: {
        default: 'h-8 px-2.5 py-1 text-sm',
        sm: 'h-7 rounded-md px-2 text-sm',
        xs: 'h-6 rounded-md px-1.5 text-xs',
      },
    },
    defaultVariants: { size: 'default' },
  },
);

type Props = Omit<React.ComponentProps<'input'>, 'size'> & VariantProps<typeof inputVariants>;

function Input({ className, type, size, ...props }: Props) {
  return <input type={type} data-slot="input" className={cn(inputVariants({ size }), className)} {...props} />;
}

export { Input, inputVariants };
