import { TagInput } from '@/components/fields/TagInput';

type Props = {
  tags: Record<string, string[]>;
  onChange: (name: string, tags: string[]) => void;
};

export function TagsTable({ tags, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {Object.keys(tags).map((name) => (
        <div key={name} className="flex items-start gap-2">
          <span className="w-[30%] shrink-0 truncate pt-1.5">{name}</span>
          <TagInput tags={tags[name] ?? []} placeholder="mood:positive" onChange={(next) => onChange(name, next)} />
        </div>
      ))}
    </div>
  );
}
