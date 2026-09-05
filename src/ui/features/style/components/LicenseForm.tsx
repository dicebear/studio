import type { FrameSettings } from '@shared/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FieldRow } from '@/components/fields/FieldRow';
import { useAppStore } from '@/store';

const FIELDS: { key: keyof FrameSettings; label: string }[] = [
  { key: 'sourceTitle', label: 'Source title' },
  { key: 'source', label: 'Source URL' },
  { key: 'creator', label: 'Creator' },
  { key: 'homepage', label: 'Homepage URL' },
  { key: 'licenseName', label: 'License name' },
  { key: 'licenseUrl', label: 'License URL' },
];

export function LicenseForm() {
  const settings = useAppStore((state) => state.style.data!.frame.settings);
  const update = useAppStore((state) => state.updateFrameSettings);

  return (
    <>
      {FIELDS.map(({ key, label }) => (
        <FieldRow key={key} label={label}>
          <Input value={String(settings[key])} onChange={(event) => update({ [key]: event.target.value })} />
        </FieldRow>
      ))}
      <FieldRow label="License text">
        <Textarea
          rows={6}
          value={settings.licenseText}
          onChange={(event) => update({ licenseText: event.target.value })}
        />
      </FieldRow>
    </>
  );
}
