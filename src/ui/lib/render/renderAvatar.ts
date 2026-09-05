import { Avatar } from '@dicebear/core';
import type { StyleEntry } from './styleRegistry';
import { buildAvatarOptions, optionsFingerprint, type Overrides } from './avatarOptions';

type Render = { svg: string; uri: string | null };

const MEMO_LIMIT = 300;
const memo = new Map<string, Render>();

function remember(key: string, svg: string): Render {
  if (memo.size >= MEMO_LIMIT) {
    const oldest = memo.keys().next().value;

    if (oldest !== undefined) {
      memo.delete(oldest);
    }
  }

  const render = { svg, uri: null };

  memo.set(key, render);

  return render;
}

function render(entry: StyleEntry, seed: string, size: number, overrides: Overrides): Render {
  const key = `${entry.key}|${seed}|${size}|${optionsFingerprint(overrides)}`;

  return (
    memo.get(key) ??
    remember(key, new Avatar(entry.style, buildAvatarOptions(overrides, seed, size) as never).toString())
  );
}

/** The SVG of one avatar, memoised per style, seed, size and options. */
export function renderSvg(entry: StyleEntry, seed: string, size: number, overrides: Overrides): string {
  return render(entry, seed, size, overrides).svg;
}

/** The same avatar as a data URI, encoded once per render. */
export function renderDataUri(entry: StyleEntry, seed: string, size: number, overrides: Overrides): string {
  const known = render(entry, seed, size, overrides);

  known.uri ??= toDataUri(known.svg);

  return known.uri;
}

export function toDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Drops the renders of a style, for when the style goes. */
export function forgetRenders(styleKey: string): void {
  for (const key of memo.keys()) {
    if (key.startsWith(`${styleKey}|`)) {
      memo.delete(key);
    }
  }
}
