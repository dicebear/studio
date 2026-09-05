import type { ReactNode } from 'react';

type Props = {
  label: string;
  /** Rendered right after the label, for a reset button. */
  action?: ReactNode;
  /** Rendered at the right end of the label row, for the current value. */
  value?: ReactNode;
  children?: ReactNode;
};

/** A labelled control, the row every form is built from. */
export function FieldRow({ label, action, value, children }: Props) {
  return (
    <div className="mb-3 flex flex-col gap-2">
      <div className="flex h-7 items-center gap-1.5 px-0.5 font-semibold">
        <span className="whitespace-nowrap">{label}</span>
        {action}
        {value !== undefined && <span className="ml-auto font-semibold tabular-nums">{value}</span>}
      </div>
      {children}
    </div>
  );
}
