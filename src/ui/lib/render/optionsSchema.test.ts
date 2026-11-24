import { describe, expect, it } from 'vitest';
import { groupOptions, humanize } from './optionsSchema';
import { registerStyle } from './styleRegistry';

const definition = {
  canvas: {
    width: 10,
    height: 10,
    elements: [
      { type: 'component', name: 'face' },
      { type: 'component', name: 'hat' },
    ],
  },
  components: {
    face: {
      width: 10,
      height: 10,
      variants: {
        round: {
          elements: [
            { type: 'element', name: 'circle', attributes: { r: '5', fill: { type: 'color', name: 'skin' } } },
          ],
        },
      },
    },
    hat: {
      width: 10,
      height: 4,
      probability: 50,
      variants: { cap: { elements: [{ type: 'element', name: 'rect', attributes: { width: '10', height: '4' } }] } },
    },
  },
  colors: {
    background: { values: ['#b6e3f4', '#c0aede'] },
    skin: { values: ['#ffdbac', '#8d5524'] },
  },
};

describe('groupOptions', () => {
  it('sorts the descriptor into the panel groups', () => {
    const entry = registerStyle({ kind: 'library', id: 'test', title: 'Test' }, definition);
    const groups = groupOptions(entry);
    const byId = Object.fromEntries(groups.map((group) => [group.id, group.fields.map((f) => f.name)]));

    expect(byId.appearance).toBeUndefined();
    expect(byId.components).toEqual(['faceVariant', 'faceProbability', 'hatVariant', 'hatProbability']);
    expect(byId.colors).toEqual(['backgroundColor', 'skinColor']);
    expect(byId.advanced).toBeUndefined();
    expect(groups.find((g) => g.id === 'colors')!.fields[0].palette).toEqual(['b6e3f4', 'c0aede']);
    expect(groups.find((g) => g.id === 'colors')!.fields[1].palette).toEqual(['ffdbac', '8d5524']);
  });

  it('leaves out the animation options, which do nothing on a still image', () => {
    const animated = structuredClone(definition);

    (animated.components.face.variants.round.elements[0] as Record<string, unknown>).animations = [
      {
        name: 'spin',
        duration: 1,
        tracks: { rotate: { keyframes: [{ at: 0, value: 0 }, { at: 100, value: 360 }] } },
      },
    ];

    const entry = registerStyle({ kind: 'library', id: 'animated', title: 'Animated' }, animated);
    const names = groupOptions(entry).flatMap((group) => group.fields.map((f) => f.name));

    expect(names.filter((name) => name.startsWith('animation'))).toEqual([]);
  });

  it('humanizes option names', () => {
    expect(humanize('hairAccessoriesColor')).toBe('Hair accessories color');
    expect(humanize('big-ears')).toBe('Big ears');
  });
});
