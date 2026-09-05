/** The message of whatever was thrown, for people to read. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
