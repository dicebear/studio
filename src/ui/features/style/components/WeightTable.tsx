import { NumberInput } from '@/components/fields/NumberInput';

type Props = {
  weights: Record<string, number>;
  onChange: (name: string, weight: number) => void;
};

export function WeightTable({ weights, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {Object.keys(weights).map((name) => (
        <label key={name} className="flex items-center gap-2">
          <span className="flex-1 truncate">{name}</span>
          <NumberInput
            size="sm"
            className="w-24 text-right tabular-nums"
            value={weights[name]}
            min={0}
            max={1_000_000}
            step="any"
            onCommit={(value) => onChange(name, value)}
          />
        </label>
      ))}
    </div>
  );
}
