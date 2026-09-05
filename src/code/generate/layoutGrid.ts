import type { GenerateLayout } from '@shared/messages';

export type Point = { x: number; y: number };

/** Where the tile at `index` sits, row-major from `origin`. */
export function gridPoint(index: number, layout: GenerateLayout, origin: Point): Point {
  const columns = Math.max(1, Math.floor(layout.columns));
  const pitch = layout.size + layout.gap;

  return {
    x: origin.x + (index % columns) * pitch,
    y: origin.y + Math.floor(index / columns) * pitch,
  };
}

/** Row-major positions for `count` tiles, starting at `origin`. */
export function layoutGrid(count: number, layout: GenerateLayout, origin: Point): Point[] {
  return Array.from({ length: count }, (_, index) => gridPoint(index, layout, origin));
}

/** The size of the whole grid, for centring it. */
export function gridSize(count: number, layout: GenerateLayout): { width: number; height: number } {
  const columns = Math.max(1, Math.min(count, Math.floor(layout.columns)));
  const rows = Math.ceil(count / columns);
  const pitch = layout.size + layout.gap;

  return {
    width: columns * pitch - layout.gap,
    height: rows * pitch - layout.gap,
  };
}
