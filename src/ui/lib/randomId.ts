/**
 * A random id for library entries. `crypto.randomUUID` needs a secure
 * context, which Figma's plugin iframe is not, so this draws the bytes itself.
 */
export function randomId(): string {
  const bytes = new Uint8Array(16);

  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
