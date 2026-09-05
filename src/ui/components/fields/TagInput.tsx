import { useState, type KeyboardEvent } from 'react';
import { isValidVariantTag, MAX_VARIANT_TAGS } from '@shared/settings';

type Props = {
  tags: string[];
  placeholder?: string;
  onChange: (tags: string[]) => void;
};

/**
 * A chip input for variant tags. Enter or comma commits, Backspace on an
 * empty draft removes the last chip. A malformed token stays in the draft so
 * the user can see and fix it.
 */
export function TagInput({ tags, placeholder, onChange }: Props) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const tokens = draft
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token.length > 0);

    if (tokens.length === 0) {
      setDraft('');

      return;
    }

    const next = [...tags];
    const invalid: string[] = [];

    for (const token of tokens) {
      if (!isValidVariantTag(token)) {
        invalid.push(token);
      } else if (next.length < MAX_VARIANT_TAGS && !next.includes(token)) {
        next.push(token);
      }
    }

    if (next.length !== tags.length) {
      onChange(next);
    }

    setDraft(invalid.join(', '));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();

      return;
    }

    if (event.key === 'Backspace' && !event.repeat && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex min-h-7 flex-1 flex-wrap items-center gap-1 rounded-md border bg-background px-1.5 py-[3px] focus-within:border-ring">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 rounded-md bg-muted py-px pr-0.5 pl-1.5 tabular-nums"
        >
          {tag}
          <button
            type="button"
            className="px-0.5 text-lg leading-none text-muted-foreground hover:text-foreground"
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(tags.filter((t) => t !== tag))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        className="h-5 min-w-20 flex-1 bg-transparent outline-none"
        value={draft}
        placeholder={tags.length === 0 ? placeholder : ''}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
      />
    </div>
  );
}
