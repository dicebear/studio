import { describe, expect, it } from 'vitest';

import { formatAnimMarkerName, parseAnimMarkerName } from './markers';

describe('animation marker names', () => {
  it('round-trips a name', () => {
    expect(formatAnimMarkerName('hop')).toBe('dbanim:hop');
    expect(parseAnimMarkerName('dbanim:hop')).toEqual({ name: 'hop' });
  });

  it('yields no marker name when there is nothing to carry', () => {
    expect(formatAnimMarkerName(undefined)).toBeNull();
  });

  it('still parses the retired origin suffix', () => {
    expect(parseAnimMarkerName('dbanim:hop@50,100')).toEqual({
      name: 'hop',
      origin: { x: 50, y: 100 },
    });
    expect(parseAnimMarkerName('dbanim:@25.5,-10')).toEqual({ origin: { x: 25.5, y: -10 } });
  });

  it('rejects layer names outside the marker format', () => {
    expect(parseAnimMarkerName('animated')).toBeNull();
    expect(parseAnimMarkerName('dbanim:')).toBeNull();
    expect(parseAnimMarkerName('dbanim:Hop')).toBeNull();
    expect(parseAnimMarkerName('dbanim:hop@x,y')).toBeNull();
  });
});
