export const TOLERANCE = 0.001;

export function snap(value: number): number {
  return Math.abs(value) < TOLERANCE ? 0 : value;
}
