import { Input } from '@/components/ui/input';
import { FieldRow } from '@/components/fields/FieldRow';
import { NumberInput } from '@/components/fields/NumberInput';
import { SimpleSelect } from '@/components/fields/SimpleSelect';
import { useAppStore } from '@/store';

const SHAPE_RENDERINGS = ['auto', 'optimizeSpeed', 'crispEdges', 'geometricPrecision'];

export function GeneralForm() {
  const data = useAppStore((state) => state.style.data)!;
  const update = useAppStore((state) => state.updateFrameSettings);
  const settings = data.frame.settings;

  const backgroundOptions = Object.keys(data.colors).map((name) => ({ label: name, value: name }));

  return (
    <>
      <FieldRow label="Title">
        <Input value={settings.title} onChange={(event) => update({ title: event.target.value })} />
      </FieldRow>
      <FieldRow label="Background color">
        <SimpleSelect
          value={settings.backgroundColorGroupName || null}
          emptyLabel="None"
          options={backgroundOptions}
          onChange={(value) => update({ backgroundColorGroupName: value ?? '' })}
        />
      </FieldRow>
      <FieldRow label="Shape rendering">
        <SimpleSelect
          value={settings.shapeRendering}
          options={SHAPE_RENDERINGS.map((value) => ({ label: value, value }))}
          onChange={(value) => update({ shapeRendering: value! })}
        />
      </FieldRow>
      <FieldRow label="Precision">
        <NumberInput
          value={settings.precision}
          min={0}
          max={8}
          onCommit={(value) => update({ precision: Math.round(value) })}
        />
      </FieldRow>
    </>
  );
}
