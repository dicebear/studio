import { loadFirstFont } from '../utils/loadFirstFont';
import { BRAND_ACCENT, BRAND_BACKGROUND, LOGO_SVG } from './logo';

export type GuideOptions = {
  title: string;
  paintStylesByGroup: Map<string, PaintStyle[]>;
  warnOnce: (message: string) => void;
};

// The guide lives on the Avatar page itself and flanks the real avatar frame:
// one card per audience, each pointing at the frame. The layout is authored
// for a reference frame of 480px sitting at REF_FRAME_POS and rescaled to the
// actual frame size at the end, so the composition keeps its proportions for
// every canvas size.
const REF_FRAME = 480;
const REF_FRAME_X = 760;
const REF_FRAME_Y = 360;
const CARD_WIDTH = 520;
const CANVAS_COLOR = '#2c2c2c';
const BODY_COLOR = '#ffffffd9';
const MUTED_COLOR = '#ffffffb8';

type Fonts = {
  heading: FontName;
  body: FontName;
};

async function loadFonts(): Promise<Fonts | null> {
  const heading = await loadFirstFont([
    { family: 'Manrope', style: 'Bold' },
    { family: 'Inter', style: 'Bold' },
  ]);
  const body = await loadFirstFont([{ family: 'Inter', style: 'Regular' }]);

  return heading && body ? { heading, body } : null;
}

/**
 * Places the two-path guide around the given avatar frame and returns the
 * created group, or null when the required fonts are missing.
 */
export async function createGuide(page: PageNode, frame: FrameNode, options: GuideOptions): Promise<SceneNode | null> {
  const fonts = await loadFonts();

  if (!fonts) {
    options.warnOnce('The guide was skipped because the Inter font is not available.');

    return null;
  }

  // The guide works with white text and brand cards, the default light canvas
  // would swallow it.
  page.backgrounds = [figma.util.solidPaint(CANVAS_COLOR)];

  const nodes: SceneNode[] = [];

  const add = <T extends SceneNode>(node: T): T => {
    page.appendChild(node);
    nodes.push(node);

    return node;
  };

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

  const addStep = (card: FrameNode, step: number, content: string): void => {
    const row = createAutoFrame(`Step ${step}`, 'HORIZONTAL', 16);

    row.counterAxisAlignItems = 'CENTER';
    card.appendChild(row);

    const bubble = createAutoFrame(String(step), 'HORIZONTAL', 0);

    bubble.primaryAxisSizingMode = 'FIXED';
    bubble.counterAxisSizingMode = 'FIXED';
    bubble.primaryAxisAlignItems = 'CENTER';
    bubble.counterAxisAlignItems = 'CENTER';
    bubble.cornerRadius = 15;
    bubble.fills = [figma.util.solidPaint(BRAND_BACKGROUND)];
    row.appendChild(bubble);
    bubble.resize(30, 30);
    bubble.appendChild(createText(fonts.heading, 15, '#ffffff', String(step)));

    const text = createText(fonts.body, 17, BODY_COLOR, content);

    row.appendChild(text);
    text.lineHeight = { value: 140, unit: 'PERCENT' };
    text.textAutoResize = 'HEIGHT';
    text.resize(CARD_WIDTH - 80 - 46, text.height);
  };

  const createCard = (title: string, x: number): FrameNode => {
    const card = createAutoFrame(title, 'VERTICAL', 18);

    card.fills = [figma.util.solidPaint(BRAND_ACCENT)];
    card.cornerRadius = 18;
    card.paddingLeft = 40;
    card.paddingRight = 40;
    card.paddingTop = 44;
    card.paddingBottom = 36;
    add(card);
    card.counterAxisSizingMode = 'FIXED';
    card.resize(CARD_WIDTH, card.height);
    card.x = x;
    card.y = 300;
    card.appendChild(createText(fonts.heading, 26, '#ffffff', title));

    return card;
  };

  const addTab = (card: FrameNode, label: string): void => {
    const tab = createAutoFrame(label, 'HORIZONTAL', 0);

    tab.fills = [figma.util.solidPaint(BRAND_BACKGROUND)];
    tab.strokes = [figma.util.solidPaint('#ffffff2e')];
    tab.strokeWeight = 2;
    tab.cornerRadius = 26;
    tab.primaryAxisAlignItems = 'CENTER';
    tab.counterAxisAlignItems = 'CENTER';
    add(tab);

    const labelText = createText(fonts.heading, 19, '#ffffff', label);

    tab.appendChild(labelText);

    // Hug sizing on the counter axis does not settle for frames that sit
    // directly on the page, so the tab gets explicit dimensions.
    tab.primaryAxisSizingMode = 'FIXED';
    tab.counterAxisSizingMode = 'FIXED';
    tab.resize(labelText.width + 44, 52);
    tab.x = card.x + 28;
    tab.y = card.y - 26;
  };

  const addConnector = (x1: number, y1: number, qx: number, qy: number, x2: number, y2: number): void => {
    const vector = figma.createVector();

    add(vector);
    vector.name = 'Path';
    vector.vectorPaths = [{ windingRule: 'NONE', data: `M ${x1} ${y1} Q ${qx} ${qy} ${x2} ${y2}` }];
    vector.fills = [];
    vector.strokes = [figma.util.solidPaint('#ffffff')];
    vector.strokeWeight = 6;
    vector.strokeCap = 'ROUND';
    vector.dashPattern = [0.1, 16];

    const dot = figma.createEllipse();

    add(dot);
    dot.name = 'End';
    dot.resize(14, 14);
    dot.x = x2 - 7;
    dot.y = y2 - 7;
    dot.fills = [figma.util.solidPaint('#ffffff')];
  };

  // Header, centered on the frame
  const centerX = REF_FRAME_X + REF_FRAME / 2;

  try {
    const logo = figma.createNodeFromSvg(LOGO_SVG);

    logo.name = 'Logo';
    add(logo);
    logo.rescale(52 / logo.height);
    logo.x = centerX - logo.width / 2;
    logo.y = -40;
  } catch {
    // The heading below carries the header on its own.
  }

  const heading = add(createText(fonts.heading, 44, '#ffffff', 'Start here, right on this page'));

  heading.x = centerX - heading.width / 2;
  heading.y = 40;

  // Left card: people who only want an avatar.
  const buildCard = createCard('Build your avatar', 80);

  addStep(
    buildCard,
    1,
    'Double-click a part of this frame, then pick a variant from the dropdown in the right sidebar.',
  );
  addStep(buildCard, 2, 'Keep double-clicking to reach a shape, then rebind its fill to another color style.');
  addStep(buildCard, 3, 'Duplicate with Cmd/Ctrl + D, or copy the frame into any of your files.');

  // The richest palette makes the best sample row. Background only wins when
  // it has strictly more values, for styles whose color all sits there.
  let paletteStyles: PaintStyle[] | null = null;

  for (const [groupName, styles] of options.paintStylesByGroup) {
    if (groupName !== 'background' && (!paletteStyles || styles.length > paletteStyles.length)) {
      paletteStyles = styles;
    }
  }

  const backgroundStyles = options.paintStylesByGroup.get('background');

  if (backgroundStyles && backgroundStyles.length > (paletteStyles?.length ?? 0)) {
    paletteStyles = backgroundStyles;
  }

  if (paletteStyles && paletteStyles.length >= 3) {
    const row = createAutoFrame('Palette', 'HORIZONTAL', 12);

    buildCard.appendChild(row);

    for (const style of paletteStyles.slice(0, 7)) {
      const swatch = figma.createEllipse();

      swatch.name = style.name;
      row.appendChild(swatch);
      swatch.resize(24, 24);
      await swatch.setFillStyleIdAsync(style.id);
    }
  }

  // Right card: people who edit the style and export it.
  const exportCard = createCard('Edit, then export', 1400);

  addStep(exportCard, 1, 'Every part lives on the Components page, named group/variant.');
  addStep(exportCard, 2, 'Select this frame, it stores all the style settings.');
  addStep(exportCard, 3, 'Right-click, Plugins, DiceBear Studio, then export the definition file.');

  const button = createAutoFrame('Read the full guide', 'HORIZONTAL', 0);

  button.fills = [figma.util.solidPaint('#ffffff')];
  button.cornerRadius = 25;
  button.paddingLeft = 28;
  button.paddingRight = 28;
  button.paddingTop = 14;
  button.paddingBottom = 14;
  exportCard.appendChild(button);

  const buttonLabel = createText(fonts.heading, 19, BRAND_BACKGROUND, 'Read the full guide');

  button.appendChild(buttonLabel);
  buttonLabel.hyperlink = { type: 'URL', value: 'https://www.dicebear.com/guides/create-an-avatar-style-with-figma/' };

  // Tabs after the cards, so they sit on top of the card edge.
  addTab(buildCard, 'Just here for an avatar?');
  addTab(exportCard, 'Changing the style?');

  // Dotted connectors from each card towards the frame.
  addConnector(620, 420, 690, 440, 742, 480);
  addConnector(1382, 440, 1320, 460, 1260, 490);

  // Footer
  const footer = add(
    createText(
      fonts.body,
      19,
      MUTED_COLOR,
      'Components and palettes live on the next page. Made with DiceBear Studio · dicebear.com',
    ),
  );

  footer.hyperlink = { type: 'URL', value: 'https://www.dicebear.com/' };
  footer.x = REF_FRAME_X + REF_FRAME / 2 - footer.width / 2;
  footer.y = 1120;

  // A border around the whole arrangement, so it does not float in space.
  const borderLeft = 16;
  const borderTop = -104;
  const borderRight = 1984;
  const border = figma.createRectangle();

  add(border);
  border.name = 'Border';
  border.x = borderLeft;
  border.y = borderTop;
  border.resize(borderRight - borderLeft, footer.y + footer.height + 72 - borderTop);
  border.fills = [];
  border.strokes = [figma.util.solidPaint('#ffffff26')];
  border.strokeWeight = 2;
  border.cornerRadius = 28;

  // Group, scale to the real frame size, and anchor on the frame.
  const group = figma.group(nodes, page);

  group.name = 'Start here';
  group.insertChild(0, border);

  const scale = frame.width / REF_FRAME;
  const groupX = group.x;
  const groupY = group.y;

  if (scale !== 1) {
    group.rescale(scale);
  }

  group.x = frame.x + (groupX - REF_FRAME_X) * scale;
  group.y = frame.y + (groupY - REF_FRAME_Y) * scale;
  group.locked = true;

  return group;
}
