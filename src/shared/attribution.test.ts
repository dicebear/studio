import { describe, expect, it } from 'vitest';
import { attributionText } from './attribution';

const meta = (creator: string, source: string, license: string) => ({
  creator: { name: creator, url: 'https://c' },
  source: { name: source, url: 'https://s' },
  license: { name: license, url: 'https://l' },
});

describe('attribution', () => {
  it('calls a CC BY style a remix and links its parts', () => {
    expect(attributionText(meta('Lisa', 'Lorelei', 'CC BY 4.0'))).toBe(
      'Remix of “Lorelei” by Lisa, licensed under CC BY 4.0',
    );
  });

  it('calls an MIT style a port', () => {
    expect(attributionText(meta('Bootstrap', 'Bootstrap Icons', 'MIT'))).toBe(
      'Based on “Bootstrap Icons” by Bootstrap, licensed under MIT',
    );
  });

  it('credits no one upstream for own work', () => {
    expect(attributionText(meta('DiceBear', 'Thumbs', 'CC0 1.0'))).toBe('By DiceBear, licensed under CC0 1.0');
  });

  it('marks an uploaded style as unverified', () => {
    expect(attributionText(meta('Lisa', 'Lorelei', 'CC BY 4.0'), { unverified: true })).toBe(
      'Remix of “Lorelei” by Lisa, licensed under CC BY 4.0 (as stated by the creator; DiceBear has not verified this)',
    );
  });

  it('copes with a missing source title', () => {
    expect(attributionText(meta('Pablo', '', 'Free for personal and commercial use'))).toBe(
      'Based on work by Pablo, licensed under Free for personal and commercial use',
    );
  });
});
