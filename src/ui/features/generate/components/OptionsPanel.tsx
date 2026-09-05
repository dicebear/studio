import { memo, useMemo } from 'react';
import { NumberInput } from '@/components/fields/NumberInput';
import { colorOverrides, optionsFingerprint, type Overrides } from '@/lib/render/avatarOptions';
import { renderComponentVariant } from '@/lib/render/componentPreview';
import { groupOptions, type OptionFieldSpec, type OptionGroup } from '@/lib/render/optionsSchema';
import type { StyleEntry } from '@/lib/render/styleRegistry';
import { cn } from '@/lib/utils';
import { useGenerateStore } from '@/store/generate';
import { OptionField } from './OptionField';
import { Section } from '@/components/Section';
import { VariantField } from './VariantField';

type RowProps = {
  entry: StyleEntry;
  component: string;
  variant?: OptionFieldSpec;
  probability?: OptionFieldSpec;
  seed: string;
  variantValue: unknown;
  probabilityValue: unknown;
  colors: Overrides;
  setOverride: (name: string, value: unknown) => void;
};

/** One component on one line: its picture, its name, which variants, how often. */
const ComponentRow = memo(function ComponentRow({
  entry,
  component,
  variant,
  probability,
  seed,
  variantValue,
  probabilityValue,
  colors,
  setOverride,
}: RowProps) {
  const values = variant?.descriptor.type === 'enum' ? variant.descriptor.values : [];
  const selected = Array.isArray(variantValue) ? (variantValue as string[]) : [];
  const changed = variantValue !== undefined || probabilityValue !== undefined;
  const defaultProbability = entry.style.components().get(component)?.probability() ?? 100;
  const currentProbability = typeof probabilityValue === 'number' ? probabilityValue : defaultProbability;
  const shown = selected[0] ?? values[0];

  const thumb = useMemo(
    () => (shown ? renderComponentVariant(entry, component, shown, colors, seed) : ''),
    [entry, component, shown, colors, seed],
  );

  return (
    <div className="flex h-7 items-center gap-2">
      <span className="size-6 shrink-0 overflow-hidden rounded-md bg-muted">
        {thumb && <img src={thumb} alt="" className="size-full" />}
      </span>
      <span className={cn('flex min-w-0 flex-1 items-center gap-1', changed && 'font-medium')}>
        <span className="truncate">{variant?.label ?? probability?.label ?? component}</span>
      </span>
      {variant && (
        <VariantField
          entry={entry}
          component={component}
          values={values}
          selected={selected}
          seed={seed}
          colors={colors}
          onChange={(next) => setOverride(variant.name, next)}
        />
      )}
      {probability && (
        <NumberInput
          size="xs"
          className="w-12 text-right"
          title="Probability in percent"
          value={currentProbability}
          min={0}
          max={100}
          onCommit={(value) => {
            const next = Math.round(value);

            setOverride(probability.name, next === defaultProbability ? null : next);
          }}
        />
      )}
    </div>
  );
});

function Group({ group, entry, seed }: { group: OptionGroup; entry: StyleEntry; seed: string }) {
  const overrides = useGenerateStore((state) => state.overrides);
  const setOverride = useGenerateStore((state) => state.setOverride);
  const changed = group.fields.filter((field) => overrides[field.name] !== undefined).length;

  // Colors change how a component looks, variants of other components do not,
  // so the rows get an object that only changes with the colors.
  const colorsKey = optionsFingerprint(colorOverrides(overrides));
  const colors = useMemo(() => JSON.parse(colorsKey) as Overrides, [colorsKey]);

  const components = useMemo(() => {
    const byComponent = new Map<string, { variant?: OptionFieldSpec; probability?: OptionFieldSpec }>();

    for (const field of group.fields) {
      const entry = byComponent.get(field.component!) ?? {};

      if (field.kind === 'variant') {
        entry.variant = field;
      } else {
        entry.probability = field;
      }

      byComponent.set(field.component!, entry);
    }

    return [...byComponent.entries()];
  }, [group]);

  return (
    <Section
      title={group.title}
      aside={changed > 0 ? <span className="text-muted-foreground">{changed} changed</span> : undefined}
    >
      {group.id === 'components'
        ? components.map(([component, fields]) => (
            <ComponentRow
              key={component}
              entry={entry}
              component={component}
              variant={fields.variant}
              probability={fields.probability}
              seed={seed}
              variantValue={fields.variant ? overrides[fields.variant.name] : undefined}
              probabilityValue={fields.probability ? overrides[fields.probability.name] : undefined}
              colors={colors}
              setOverride={setOverride}
            />
          ))
        : group.fields.map((field) => (
            <OptionField
              key={field.name}
              spec={field}
              value={overrides[field.name]}
              onChange={(value) => setOverride(field.name, value)}
            />
          ))}
    </Section>
  );
}

export function OptionsPanel({ entry, seed }: { entry: StyleEntry; seed: string }) {
  const groups = useMemo(() => groupOptions(entry), [entry]);

  return (
    <>
      {groups.map((group) => (
        <Group key={group.id} group={group} entry={entry} seed={seed} />
      ))}
      <p className="px-3 py-3 text-muted-foreground">
        Every option of a style, transforms and gradients included, is in the{' '}
        <a
          className="text-brand-foreground hover:underline"
          href={
            entry.source.kind === 'collection'
              ? `https://www.dicebear.com/playground?style=${encodeURIComponent(entry.source.name)}`
              : 'https://www.dicebear.com/playground'
          }
          target="_blank"
          rel="noopener"
        >
          playground on dicebear.com
        </a>
        .
      </p>
    </>
  );
}
