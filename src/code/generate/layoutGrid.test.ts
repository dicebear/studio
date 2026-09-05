import { describe, expect, it } from 'vitest';
import { gridSize, layoutGrid } from './layoutGrid';

const layout = { size: 100, columns: 3, gap: 10 };

describe('layoutGrid', () => {
  it('lays tiles out row by row', () => {
    expect(layoutGrid(4, layout, { x: 5, y: 7 })).toEqual([
      { x: 5, y: 7 },
      { x: 115, y: 7 },
      { x: 225, y: 7 },
      { x: 5, y: 117 },
    ]);
  });

  it('measures the grid without a trailing gap', () => {
    expect(gridSize(1, layout)).toEqual({ width: 100, height: 100 });
    expect(gridSize(12, layout)).toEqual({ width: 320, height: 430 });
    expect(gridSize(13, layout)).toEqual({ width: 320, height: 540 });
  });
});
