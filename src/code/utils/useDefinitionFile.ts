/** The DiceBear lines that take a JSON definition file instead of an npm package. */
const DEFINITION_VERSIONS = ['10.x', '11.x'];

export function useDefinitionFile(dicebearVersion: string): boolean {
  return DEFINITION_VERSIONS.includes(dicebearVersion);
}

/**
 * Whether the DiceBear line can play declarative animations. The 10.x cores
 * render every definition static, so the export leaves the animations out
 * for them.
 */
export function useAnimations(dicebearVersion: string): boolean {
  return dicebearVersion === '11.x';
}

/**
 * The `$schema` an exported definition references. Schema 2 belongs to the
 * 11.x line with its animation blocks, so a 10.x definition points at the
 * last release before them.
 */
export function definitionSchemaVersion(dicebearVersion: string): string {
  return useAnimations(dicebearVersion) ? '2.0.1' : '1.5.1';
}
