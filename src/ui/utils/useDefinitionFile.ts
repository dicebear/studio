const DEFINITION_VERSIONS = ['10.x', '11.x'];

export function useDefinitionFile(dicebearVersion: string): boolean {
  return DEFINITION_VERSIONS.includes(dicebearVersion);
}
