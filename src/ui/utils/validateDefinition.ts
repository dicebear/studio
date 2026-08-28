import { Style } from '@dicebear/core';

type ValidationDetail = { instancePath?: string; message?: string };

function getDetails(error: unknown): ValidationDetail[] | null {
  const details = error && typeof error === 'object' ? (error as { details?: unknown }).details : undefined;

  return Array.isArray(details) ? (details as ValidationDetail[]) : null;
}

/**
 * Validates a parsed definition file. The check runs through `Style`, so the UI
 * rejects exactly what the renderer would reject, down to the wording.
 * Returns a readable list of problems, empty when the file is valid.
 */
export function validateDefinition(definition: unknown): string[] {
  try {
    new Style(definition);

    return [];
  } catch (error) {
    const details = getDetails(error);

    if (details === null) {
      return [error instanceof Error ? error.message : 'is not a valid definition file'];
    }

    const seen = new Set<string>();
    const problems: string[] = [];

    for (const detail of details) {
      const message = `${detail.instancePath || '/'} ${detail.message ?? 'is invalid'}`;

      if (!seen.has(message)) {
        seen.add(message);
        problems.push(message);
      }
    }

    return problems;
  }
}
