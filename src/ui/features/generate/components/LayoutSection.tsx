import { NumberInput } from '@/components/fields/NumberInput';
import { useGenerateStore } from '@/store/generate';
import { Section } from '@/components/Section';

const ROWS: { key: 'size' | 'columns' | 'gap'; label: string; min: number; max: number }[] = [
  { key: 'size', label: 'Size in px', min: 16, max: 4096 },
  { key: 'columns', label: 'Columns', min: 1, max: 50 },
  { key: 'gap', label: 'Gap in px', min: 0, max: 1000 },
];

export function LayoutSection() {
  const layout = useGenerateStore((state) => state.layout);
  const setLayout = useGenerateStore((state) => state.setLayout);

  return (
    <Section title="Layout">
      {ROWS.map((row) => (
        <label key={row.key} className="flex items-center gap-2">
          <span className="flex-1">{row.label}</span>
          <NumberInput
            size="sm"
            className="w-20 text-right"
            value={layout[row.key]}
            min={row.min}
            max={row.max}
            onCommit={(value) => setLayout({ [row.key]: Math.round(value) })}
          />
        </label>
      ))}
    </Section>
  );
}
