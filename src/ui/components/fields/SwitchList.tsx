import { Switch } from '@/components/ui/switch';

type Props = {
  values: Record<string, boolean>;
  options: readonly string[];
  onChange: (name: string, checked: boolean) => void;
};

export function SwitchList({ values, options, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((name) => (
        <label key={name} className="flex cursor-pointer items-center gap-2">
          <Switch size="sm" checked={values[name] ?? false} onCheckedChange={(checked) => onChange(name, checked)} />
          <span>{name}</span>
        </label>
      ))}
    </div>
  );
}
