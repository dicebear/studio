import type { ReactNode } from 'react';
import { attributionParts } from '@shared/attribution';
import type { StyleEntry } from '@/lib/render/styleRegistry';

function link(text: string, url: string | undefined, key: string): ReactNode {
  return url ? (
    <a key={key} href={url} target="_blank" rel="noopener" className="text-foreground hover:underline">
      {text}
    </a>
  ) : (
    <span key={key}>{text}</span>
  );
}

/** The credit line of a style, with the creator, source and license as links. */
export function StyleCredit({ entry }: { entry: StyleEntry }) {
  if (entry.source.kind !== 'library') {
    return attributionParts({ creator: entry.creator, source: entry.sourceMeta, license: entry.license }).map(
      (part, index) => link(part.text, part.url, String(index)),
    );
  }

  // What an uploaded definition says about itself is the uploader's claim,
  // the same wording the playground on dicebear.com uses.
  const { creator, sourceMeta, license } = entry;

  if (!creator.name && !license.name) {
    return 'This style was provided by a user. License and copyright have not been verified by DiceBear.';
  }

  return (
    <>
      <span className="font-semibold">{entry.title}</span>
      {sourceMeta.name && <> is based on {link(`“${sourceMeta.name}”`, sourceMeta.url || undefined, 'source')}</>}
      {creator.name && <> by {link(creator.name, creator.url || undefined, 'creator')}</>}
      {license.name && <>, licensed under {link(license.name, license.url || undefined, 'license')}</>} (as stated by
      the creator; DiceBear has not verified this).
    </>
  );
}
