import { FieldRow } from '@/components/fields/FieldRow';
import { SimpleSelect } from '@/components/fields/SimpleSelect';
import { SwitchList } from '@/components/fields/SwitchList';
import { useAppStore } from '@/store';

export function ColorGroupPanel({ group }: { group: string }) {
  const data = useAppStore((state) => state.style.data)!;
  const update = useAppStore((state) => state.updateColorSettings);
  const settings = data.colors[group].settings;

  const others = Object.keys(data.colors).filter((name) => data.colors[name].isUsedByComponents && name !== group);
  const contrastOptions = ['background', ...others].map((name) => ({ label: name, value: name }));

  return (
    <>
      <FieldRow label="Should be a contrast color to">
        <SimpleSelect
          value={settings.contrastTo}
          emptyLabel="None"
          options={contrastOptions}
          onChange={(value) => update(group, (s) => ({ ...s, contrastTo: value }))}
        />
      </FieldRow>
      <FieldRow label="Should not be identical with">
        <SwitchList
          values={settings.notEqualTo}
          options={['background', ...others]}
          onChange={(name, checked) =>
            update(group, (s) => ({ ...s, notEqualTo: { ...s.notEqualTo, [name]: checked } }))
          }
        />
      </FieldRow>
    </>
  );
}
