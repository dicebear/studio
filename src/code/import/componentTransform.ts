/** The values the resolver picked for one seed, keyed like the style options. */
export type Picks = Record<string, unknown>;

/** A 2x3 affine matrix, the shape Figma uses for `relativeTransform`. */
export type Matrix = Transform;

function pickNumber(picks: Picks, key: string, fallback: number): number {
  const value = picks[key];

  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    [
      a[0][0] * b[0][0] + a[0][1] * b[1][0],
      a[0][0] * b[0][1] + a[0][1] * b[1][1],
      a[0][0] * b[0][2] + a[0][1] * b[1][2] + a[0][2],
    ],
    [
      a[1][0] * b[0][0] + a[1][1] * b[1][0],
      a[1][0] * b[0][1] + a[1][1] * b[1][1],
      a[1][0] * b[0][2] + a[1][1] * b[1][2] + a[1][2],
    ],
  ];
}

function translation(x: number, y: number): Matrix {
  return [
    [1, 0, x],
    [0, 1, y],
  ];
}

/**
 * The transform the renderer wraps around a component reference, in the
 * instance's own units: translate by a share of the size, rotate and scale
 * around the center. Composed in the renderer's order, scale first.
 */
export function componentTransform(picks: Picks, name: string, width: number, height: number): Matrix | null {
  const rotate = pickNumber(picks, `${name}Rotate`, 0);
  const translateX = pickNumber(picks, `${name}TranslateX`, 0);
  const translateY = pickNumber(picks, `${name}TranslateY`, 0);
  const scale = pickNumber(picks, `${name}Scale`, 1);

  if (rotate === 0 && translateX === 0 && translateY === 0 && scale === 1) {
    return null;
  }

  const cx = width / 2;
  const cy = height / 2;
  const angle = (rotate * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotation: Matrix = [
    [cos, -sin, 0],
    [sin, cos, 0],
  ];
  const scaling: Matrix = [
    [scale, 0, 0],
    [0, scale, 0],
  ];

  let matrix = translation((translateX / 100) * width, (translateY / 100) * height);

  matrix = multiply(matrix, multiply(translation(cx, cy), multiply(rotation, translation(-cx, -cy))));
  matrix = multiply(matrix, multiply(translation(cx, cy), multiply(scaling, translation(-cx, -cy))));

  return matrix;
}
