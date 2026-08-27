import Ajv, { type ValidateFunction } from 'ajv';
import definitionSchema from '@dicebear/schema/definition.json';

let validator: ValidateFunction | null = null;

function getValidator(): ValidateFunction {
  // The schema ships as draft-07 without external references, so a single
  // compile covers every import.
  validator ??= new Ajv({ allErrors: true, strict: false }).compile(definitionSchema);

  return validator;
}

/**
 * Validates a parsed definition file against the DiceBear definition schema.
 * Returns a readable list of problems, empty when the file is valid.
 */
export function validateDefinition(definition: unknown): string[] {
  const validate = getValidator();

  if (validate(definition)) {
    return [];
  }

  const seen = new Set<string>();
  const problems: string[] = [];

  for (const error of validate.errors ?? []) {
    const message = `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`;

    if (!seen.has(message)) {
      seen.add(message);
      problems.push(message);
    }
  }

  return problems;
}
