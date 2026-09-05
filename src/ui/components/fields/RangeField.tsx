import type { DefinitionRange, RangeValue } from '@shared/types';
import { Slider } from '@/components/ui/slider';
import { FieldReset } from './FieldReset';
import { FieldRow } from './FieldRow';
import { NumberInput } from './NumberInput';

type Props = {
  label: string;
  value: RangeValue;
  /** The single value the range collapses to while unset. */
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: RangeValue) => void;
};

/** A min/max slider with an optional step, for the transform ranges. */
export function RangeField({ label, value, defaultValue, min, max, step, unit = '', onChange }: Props) {
  const range: [number, number] = value ? [value.min, value.max] : [defaultValue, defaultValue];
  const low = Math.min(range[0], range[1]);
  const high = Math.max(range[0], range[1]);

  const setRange = ([a, b]: number[]) => {
    const next: DefinitionRange = value?.step !== undefined ? { min: a, max: b, step: value.step } : { min: a, max: b };

    onChange(next);
  };

  const setStep = (next: number | null) => {
    if (value) {
      onChange(
        next !== null && next > 0 ? { min: value.min, max: value.max, step: next } : { min: value.min, max: value.max },
      );
    }
  };

  return (
    <FieldRow
      label={label}
      action={value !== null && <FieldReset onClick={() => onChange(null)} />}
      value={`${low}${unit} to ${high}${unit}`}
    >
      <Slider value={range} min={min} max={max} step={step} onValueChange={setRange} />
      <label className="flex items-center gap-1.5 text-muted-foreground">
        <span className="flex-1 text-foreground">Step</span>
        <NumberInput
          nullable
          size="xs"
          className="w-20 text-right tabular-nums"
          min={0}
          max={Math.abs(max - min)}
          step="any"
          placeholder="no step"
          value={value?.step !== undefined && value.step > 0 ? value.step : null}
          disabled={value === null}
          onCommit={setStep}
        />
        <span className="w-3.5 text-left">{unit}</span>
      </label>
    </FieldRow>
  );
}
