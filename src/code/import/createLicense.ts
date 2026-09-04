import { composeLicenseText, LicenseFields } from '../utils/getLicenseAsText';
import { loadFirstFont } from '../utils/loadFirstFont';
import { BRAND_ACCENT, LOGO_SVG } from './logo';

export type LicenseOptions = {
  settings: LicenseFields;
  warnOnce: (message: string) => void;
};

// The page holds one card, styled like the guide on the Avatar page: the
// license line the definition carries, followed by the source, the designer
// and the license as separate rows, each linked where the definition names a
// URL. It is meant for people who copy the avatar into their own files and
// need to know what they may do with it.
const CARD_WIDTH = 760;
const CARD_PADDING = 40;
const CANVAS_COLOR = '#2c2c2c';
const BODY_COLOR = '#ffffffd9';
const MUTED_COLOR = '#ffffffb8';

type Fonts = {
  heading: FontName;
  body: FontName;
};

type Row = {
  label: string;
  value: string;
  url: string;
};

async function loadFonts(): Promise<Fonts | null> {
  const heading = await loadFirstFont([
    { family: 'Manrope', style: 'Bold' },
    { family: 'Inter', style: 'Bold' },
  ]);
  const body = await loadFirstFont([{ family: 'Inter', style: 'Regular' }]);

  return heading && body ? { heading, body } : null;
}

/** Only rows the definition fills in are shown, an empty label helps nobody. */
function collectRows(settings: LicenseFields): Row[] {
  const rows: Row[] = [];
  const sourceTitle = settings.sourceTitle.trim();
  const creator = settings.creator.trim();
  const licenseName = settings.licenseName.trim();

  if (sourceTitle) {
    rows.push({ label: 'Source', value: sourceTitle, url: settings.source.trim() });
  }

  if (creator) {
    rows.push({ label: 'Designer', value: creator, url: settings.homepage.trim() });
  }

  if (licenseName) {
    rows.push({ label: 'License', value: licenseName, url: settings.licenseUrl.trim() });
  }

  return rows;
}

/**
 * Fills the given page with the license card and returns it, or null when
 * the required fonts are missing.
 */
export async function createLicense(page: PageNode, options: LicenseOptions): Promise<FrameNode | null> {
  const fonts = await loadFonts();

  if (!fonts) {
    options.warnOnce('The License page was left empty because the Inter font is not available.');

    return null;
  }

  page.backgrounds = [figma.util.solidPaint(CANVAS_COLOR)];

  const createText = (font: FontName, size: number, color: string, characters: string): TextNode => {
    const text = figma.createText();

    text.fontName = font;
    text.fontSize = size;
    text.fills = [figma.util.solidPaint(color)];
    text.characters = characters;

    return text;
  };

  const createAutoFrame = (name: string, direction: 'HORIZONTAL' | 'VERTICAL', spacing: number): FrameNode => {
    const auto = figma.createFrame();

    auto.name = name;
    auto.layoutMode = direction;
    auto.primaryAxisSizingMode = 'AUTO';
    auto.counterAxisSizingMode = 'AUTO';
    auto.itemSpacing = spacing;
    auto.fills = [];

    return auto;
  };

  // A text that wraps at the card's inner width instead of growing it
  // sideways.
  const addParagraph = (parent: FrameNode, font: FontName, size: number, color: string, characters: string) => {
    const text = createText(font, size, color, characters);

    parent.appendChild(text);
    text.lineHeight = { value: 140, unit: 'PERCENT' };
    text.textAutoResize = 'HEIGHT';
    text.resize(CARD_WIDTH - 2 * CARD_PADDING, text.height);

    return text;
  };

  const card = createAutoFrame('License', 'VERTICAL', 24);

  page.appendChild(card);
  card.fills = [figma.util.solidPaint(BRAND_ACCENT)];
  card.cornerRadius = 18;
  card.paddingLeft = CARD_PADDING;
  card.paddingRight = CARD_PADDING;
  card.paddingTop = CARD_PADDING;
  card.paddingBottom = CARD_PADDING;
  card.counterAxisSizingMode = 'FIXED';
  card.resize(CARD_WIDTH, card.height);
  card.x = 0;
  card.y = 0;

  try {
    const logo = figma.createNodeFromSvg(LOGO_SVG);

    logo.name = 'Logo';
    card.appendChild(logo);
    logo.rescale(28 / logo.height);
  } catch {
    // The heading below carries the card on its own.
  }

  card.appendChild(createText(fonts.heading, 26, '#ffffff', 'License'));

  addParagraph(card, fonts.body, 17, BODY_COLOR, composeLicenseText(options.settings));

  const rows = collectRows(options.settings);

  if (rows.length > 0) {
    const table = createAutoFrame('Details', 'VERTICAL', 14);

    card.appendChild(table);

    for (const row of rows) {
      const line = createAutoFrame(row.label, 'VERTICAL', 4);

      table.appendChild(line);

      addParagraph(line, fonts.heading, 13, MUTED_COLOR, row.label.toUpperCase());

      const value = addParagraph(line, fonts.body, 17, '#ffffff', row.url ? `${row.value} (${row.url})` : row.value);

      if (row.url) {
        value.hyperlink = { type: 'URL', value: row.url };
      }
    }
  }

  const footer = addParagraph(card, fonts.body, 15, MUTED_COLOR, 'Made with DiceBear Studio · dicebear.com');

  footer.hyperlink = { type: 'URL', value: 'https://www.dicebear.com/' };

  return card;
}
