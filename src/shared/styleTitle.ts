/** "big-ears-neutral" reads as "Big Ears Neutral" until the definition says otherwise. */
export function styleTitleFromName(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
