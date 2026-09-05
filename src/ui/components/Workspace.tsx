import type { ReactNode } from 'react';

type Props = {
  /** The 272 px column next to the rail. */
  sidebar?: ReactNode;
  /** The 48 px row at the bottom: a status on the left, the main action on the right. */
  footer: ReactNode;
  /** Sits between the body and the footer. */
  notices?: ReactNode;
  children: ReactNode;
};

/** The frame both tabs share, so switching between them moves nothing. */
export function Workspace({ sidebar, footer, notices, children }: Props) {
  return (
    <>
      <div className="flex min-h-0 flex-1">
        {sidebar && <div className="w-[272px] shrink-0 overflow-hidden border-r">{sidebar}</div>}
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
      {notices}
      <footer className="flex h-12 shrink-0 items-center gap-3 border-t px-3">{footer}</footer>
    </>
  );
}
