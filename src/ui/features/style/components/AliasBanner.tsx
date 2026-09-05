import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export function Banner({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 rounded-md border bg-muted px-3 py-2 leading-relaxed text-muted-foreground [&_strong]:text-foreground">
      {children}
    </div>
  );
}

type AliasProps = {
  group: string;
  source: string;
  instanceIds: string[];
  onReveal: () => void;
};

export function AliasBanner({ group, source, instanceIds, onReveal }: AliasProps) {
  return (
    <Banner>
      <p>
        Alias of <strong>{source}</strong>. Variants, dimensions and transforms are inherited from the source. Aliases
        have no settings of their own.
      </p>
      <p className="mt-1.5">
        This alias exists because at least one instance in Figma is renamed to <strong>{group}</strong>. To remove it,
        rename those instances back to the <strong>{source}</strong> group.
      </p>
      {instanceIds.length > 0 && (
        <Button variant="outline" size="xs" className="mt-1.5" onClick={onReveal}>
          Show {instanceIds.length} renamed instance{instanceIds.length === 1 ? '' : 's'} in Figma
        </Button>
      )}
    </Banner>
  );
}
