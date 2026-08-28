import { Avatar, Style } from '@dicebear/core';
import { DefinitionFile } from '../types';
import { loadFirstFont } from '../utils/loadFirstFont';
import { BRAND_ACCENT, BRAND_BACKGROUND, LOGO_SVG } from './logo';

export type ThumbnailOptions = {
  definition: DefinitionFile;
  title: string;
  warnOnce: (message: string) => void;
  progress: (message: string) => Promise<void>;
};

// The layout mirrors the thumbnails of the existing DiceBear style files:
// a 1600x960 navy frame, the style title above a DiceBear badge on the left,
// and a staircase of sample avatars anchored bottom-right.
const WIDTH = 1600;
const HEIGHT = 960;
const BACKGROUND = BRAND_BACKGROUND;
const ACCENT = BRAND_ACCENT;
const LEFT_MARGIN = 92;
const COLUMN_WIDTH = 702;
const BADGE_TOP = 416;
const BADGE_HEIGHT = 80;
const BADGE_RADIUS = 10;
const LOGO_HEIGHT = 40;
const TITLE_FONT_SIZE = 128;
const TILE_SIZE = 128;
const TILE_PITCH = 148;
const PYRAMID_ROWS = 6;
const PYRAMID_X = 686;
const PYRAMID_Y = 46;

const TITLE_FONTS: FontName[] = [
  { family: 'Manrope', style: 'Bold' },
  { family: 'Inter', style: 'Bold' },
];

/** One seed per tile, so importing the same definition twice matches. */
const TILE_SEEDS = [
  'Ada',
  'Bo',
  'Cleo',
  'Dana',
  'Emil',
  'Fenn',
  'Gus',
  'Hedda',
  'Isla',
  'Juno',
  'Kira',
  'Leo',
  'Mika',
  'Nova',
  'Ola',
  'Pip',
  'Quinn',
  'Remy',
  'Sasha',
  'Tam',
  'Vera',
];

/**
 * Renders one sample avatar with the DiceBear renderer, so the thumbnail
 * shows exactly what the style produces: probabilities, weights, palette
 * rules like `contrastTo`, everything comes from the real render pipeline.
 * Returns null when the renderer or the SVG import rejects the definition.
 */
function renderSampleAvatar(style: Style, seed: string, onError: (message: string) => void): FrameNode | null {
  try {
    const svg = new Avatar(style, { seed, size: TILE_SIZE, borderRadius: 50 })
      .toString()
      .replace(/<metadata[\s\S]*?<\/metadata>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    return figma.createNodeFromSvg(svg);
  } catch (e: any) {
    onError(String(e?.message ?? e));

    return null;
  }
}

async function createTitle(frame: FrameNode, title: string, warnOnce: (message: string) => void): Promise<void> {
  const font = await loadFirstFont(TITLE_FONTS);

  if (!font) {
    warnOnce('The thumbnail title was skipped because neither Manrope nor Inter is available.');

    return;
  }

  const text = figma.createText();

  frame.appendChild(text);
  text.fontName = font;
  text.fills = [figma.util.solidPaint('#ffffff')];
  text.fontSize = TITLE_FONT_SIZE;
  text.characters = title;

  if (text.width > COLUMN_WIDTH) {
    text.fontSize = Math.max(24, Math.floor((TITLE_FONT_SIZE * COLUMN_WIDTH) / text.width));
  }

  text.x = LEFT_MARGIN;
  text.y = BADGE_TOP - text.height;
}

function createBadge(frame: FrameNode, warnOnce: (message: string) => void): void {
  const badge = figma.createFrame();

  badge.name = 'DiceBear';
  frame.appendChild(badge);
  badge.resize(COLUMN_WIDTH, BADGE_HEIGHT);
  badge.x = LEFT_MARGIN;
  badge.y = BADGE_TOP;
  badge.cornerRadius = BADGE_RADIUS;
  badge.fills = [figma.util.solidPaint(ACCENT)];

  try {
    const logo = figma.createNodeFromSvg(LOGO_SVG);

    logo.name = 'Logo';
    badge.appendChild(logo);
    logo.rescale(LOGO_HEIGHT / logo.height);
    logo.x = 24;
    logo.y = (BADGE_HEIGHT - logo.height) / 2;
  } catch {
    warnOnce('The DiceBear logo could not be added to the thumbnail.');
  }
}

/**
 * Fills the given page with a cover in the style of the existing DiceBear
 * Figma files and registers it as the file thumbnail.
 */
export async function createThumbnail(page: PageNode, options: ThumbnailOptions): Promise<void> {
  const title = options.title.charAt(0).toUpperCase() + options.title.slice(1);

  const frame = figma.createFrame();

  frame.name = 'Thumbnail';
  page.appendChild(frame);
  frame.resize(WIDTH, HEIGHT);
  frame.x = 0;
  frame.y = 0;
  frame.fills = [figma.util.solidPaint(BACKGROUND)];

  await createTitle(frame, title, options.warnOnce);
  createBadge(frame, options.warnOnce);

  let style: Style | null = null;

  try {
    style = new Style(options.definition);
  } catch (e: any) {
    options.warnOnce(`The sample avatars were skipped, the renderer rejected the definition (${e.message}).`);
  }

  if (style) {
    const totalTiles = (PYRAMID_ROWS * (PYRAMID_ROWS + 1)) / 2;
    const pyramid = figma.createFrame();
    const pyramidSize = (PYRAMID_ROWS - 1) * TILE_PITCH + TILE_SIZE;

    pyramid.name = 'Avatars';
    frame.appendChild(pyramid);
    pyramid.resize(pyramidSize, pyramidSize);
    pyramid.x = PYRAMID_X;
    pyramid.y = PYRAMID_Y;
    pyramid.fills = [];
    pyramid.clipsContent = false;

    let tileIndex = 0;
    let failed = 0;
    let firstError = '';

    for (let row = 0; row < PYRAMID_ROWS; row++) {
      for (let column = 0; column <= row; column++) {
        tileIndex++;
        await options.progress(`Building the thumbnail (${tileIndex} of ${totalTiles})`);

        const tile = figma.createFrame();

        tile.name = `avatar-${tileIndex}`;
        pyramid.appendChild(tile);
        tile.resize(TILE_SIZE, TILE_SIZE);
        tile.x = (PYRAMID_ROWS - 1 - row + column) * TILE_PITCH;
        tile.y = row * TILE_PITCH;
        tile.cornerRadius = TILE_SIZE / 2;
        tile.clipsContent = true;
        // The avatar brings its own background when the style has a
        // background palette, the brand navy only fills the gap for styles
        // without one.
        tile.fills = [figma.util.solidPaint(ACCENT)];

        const avatar = renderSampleAvatar(style, TILE_SEEDS[(tileIndex - 1) % TILE_SEEDS.length], (message) => {
          firstError ||= message;
        });

        if (avatar) {
          tile.appendChild(avatar);
          avatar.x = 0;
          avatar.y = 0;
        } else {
          failed++;
        }
      }
    }

    if (failed > 0) {
      options.warnOnce(
        `${failed} of ${totalTiles} sample avatars could not be rendered for the thumbnail (${firstError}).`,
      );
    }
  }

  try {
    await figma.setFileThumbnailNodeAsync(frame);
  } catch {
    options.warnOnce('The thumbnail frame could not be registered as the file cover.');
  }
}
