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
    new Style(definition as never);

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

/**
 * Parses and validates a definition file the user picked. Throws with the
 * message the form shows when the file is not JSON or not a definition.
 */
export async function readDefinitionFile(file: File): Promise<unknown> {
  let definition: unknown;

  try {
    definition = JSON.parse(await file.text());
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  const problems = validateDefinition(definition);

  if (problems.length > 0) {
    throw new Error(`The selected file is not a valid DiceBear definition: ${describeProblems(problems)}`);
  }

  return definition;
}

/** The style title a definition file's name suggests, without the download suffixes. */
export function titleFromFileName(name: string): string {
  return name.replace(/(\.min)?\.json$/i, '');
}

/** The problems of a file as one sentence, the first few spelled out. */
export function describeProblems(problems: string[], limit = 5): string {
  const shown = problems.slice(0, limit);

  if (problems.length > shown.length) {
    shown.push(`and ${problems.length - shown.length} more`);
  }

  return shown.join('; ');
}
