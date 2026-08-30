/**
 * The animation marker layer name carries the timeline's user-selectable
 * name (`dbanim:hop`) — visible in the layer panel, editable by a designer,
 * parsed back by the export. A transform origin needs no transport: the
 * import decomposes it into native center-based tracks. The parser still
 * accepts the retired `dbanim:hop@50,100` suffix so files imported before
 * that change keep their origin on re-export.
 */

export type AnimMarker = {
  name?: string;
  origin?: { x: number; y: number };
};

const MARKER_PATTERN = /^dbanim:([a-z][a-zA-Z0-9]*)?(?:@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?))?$/;

export function formatAnimMarkerName(name: string | undefined): string | null {
  return name === undefined ? null : `dbanim:${name}`;
}

export function parseAnimMarkerName(layerName: string): AnimMarker | null {
  const match = MARKER_PATTERN.exec(layerName);

  if (!match || (match[1] === undefined && match[2] === undefined)) {
    return null;
  }

  const marker: AnimMarker = {};

  if (match[1] !== undefined) {
    marker.name = match[1];
  }

  if (match[2] !== undefined) {
    marker.origin = { x: Number(match[2]), y: Number(match[3]) };
  }

  return marker;
}
