import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { NumberInput } from '@/components/fields/NumberInput';
import { SimpleSelect } from '@/components/fields/SimpleSelect';
import type { OptionFieldSpec } from '@/lib/render/optionsSchema';
import { cn } from '@/lib/utils';
import { ColorListField } from './ColorListField';

type Props = {
  spec: OptionFieldSpec;
  value: unknown;
  /** An empty value takes the option back to the style's own choice. */
  onChange: (value: unknown) => void;
};

function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : typeof value === 'string' ? [value] : [];
}

function asRange(value: unknown, fallback: number): [number, number] {
  if (Array.isArray(value) && value.length === 2) {
    return [Number(value[0]), Number(value[1])];
  }

  if (typeof value === 'number') {
    return [value, value];
  }

  return [fallback, fallback];
}

/**
 * One option as a row: the name on the left, a compact control on the right.
 * Colors take the room they need below the name.
 */
export function OptionField({ spec, value, onChange }: Props) {
  const { descriptor } = spec;
  const changed = value !== undefined;
  const label = (
    <span className={cn('flex min-w-0 flex-1 items-center gap-1', changed && 'font-medium')}>
      <span className="truncate">{spec.label}</span>
    </span>
  );

  if (spec.kind === 'color' || descriptor.type === 'color') {
    return (
      <div className="flex min-h-7 items-start gap-2 py-1">
        <span className="flex h-5 w-20 shrink-0 items-center">{label}</span>
        <ColorListField
          palette={spec.palette ?? []}
          selected={asList(value)}
          allowTransparent={spec.name === 'backgroundColor'}
          onChange={onChange}
        />
      </div>
    );
  }

  let control: React.ReactNode;

  if (descriptor.type === 'enum') {
    control = (
      <SimpleSelect
        className="h-6 w-[128px]"
        value={asList(value)[0] ?? null}
        emptyLabel="Any"
        options={descriptor.values.map((v) => ({ label: v, value: v }))}
        onChange={(v) => onChange(v !== null && descriptor.list ? [v] : v)}
      />
    );
  } else if (descriptor.type === 'range') {
    const min = descriptor.min ?? 0;
    const max = descriptor.max ?? 100;
    const fallback = spec.name === 'scale' ? 1 : min > 0 ? min : 0;
    const [low, high] = asRange(value, fallback);
    const commit = (a: number, b: number) => onChange(a === b ? a : [Math.min(a, b), Math.max(a, b)]);

    control = (
      <span className="flex items-center gap-1">
        <NumberInput
          size="xs"
          className="w-14 text-right"
          value={low}
          min={min}
          max={max}
          onCommit={(v) => commit(v, high)}
        />
        <span className="text-muted-foreground">to</span>
        <NumberInput
          size="xs"
          className="w-14 text-right"
          value={high}
          min={min}
          max={max}
          onCommit={(v) => commit(low, v)}
        />
      </span>
    );
  } else if (descriptor.type === 'number') {
    control = (
      <NumberInput
        size="xs"
        className="w-16 text-right"
        value={typeof value === 'number' ? value : (descriptor.min ?? 0)}
        min={descriptor.min}
        max={descriptor.max}
        onCommit={onChange}
      />
    );
  } else if (descriptor.type === 'boolean') {
    control = <Switch size="sm" checked={value === true} onCheckedChange={(checked) => onChange(checked || null)} />;
  } else {
    control = (
      <Input
        size="xs"
        className="w-[128px]"
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <div className="flex h-7 items-center gap-2">
      {label}
      {control}
    </div>
  );
}
