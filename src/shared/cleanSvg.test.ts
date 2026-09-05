import { describe, expect, it } from 'vitest';
import { cleanSvg } from '@shared/cleanSvg';

describe('cleanSvg', () => {
  it('strips metadata, comments and style blocks and keeps the drawing', () => {
    const svg = '<svg><metadata><rdf:RDF>x</rdf:RDF></metadata><!-- a --><style>.a{}</style><path d="M0 0h1"/></svg>';

    expect(cleanSvg(svg)).toBe('<svg><path d="M0 0h1"/></svg>');
  });
});
