import { ComponentGroupSettings, DefinitionComponentBase, DefinitionComponents, DefinitionFile } from '../types';
import { setColorGroupSettings } from '../settings/setColorGroupSettings';
import { setComponentGroupSettings } from '../settings/setComponentGroupSettings';
import { setFrameSettings } from '../settings/setFrameSettings';
import { isSupportedColor } from '../utils/isSupportedColor';
import { isSupportedComponent } from '../utils/isSupportedComponent';
import { createGuide } from './createGuide';
import { createThumbnail } from './createThumbnail';
import {
  createDefinitionSerializer,
  DefinitionSerializer,
  PreparedRef,
  PreparedRefColor,
  resolveMasterName,
} from './serializeDefinition';

const COMPONENT_GAP = 48;
const GROUP_GAP = 160;
const MAX_ROW_WIDTH = 4000;

type PreparedVariant = {
  name: string;
  svg: string;
  refs: PreparedRef[];
};

type PreparedGroup = {
  name: string;
  variants: PreparedVariant[];
};

type ImportContext = {
  components: DefinitionComponents;
  componentIndex: Map<string, ComponentNode>;
  paintStylesByGroup: Map<string, PaintStyle[]>;
  currentColorSentinel: string;
  warn: (message: string) => void;
  warnOnce: (message: string) => void;
};

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function postProgress(message: string): Promise<void> {
  figma.ui.postMessage({ type: 'loading', data: { message } });
  await tick();
}

function validateDefinition(definition: DefinitionFile): void {
  const canvas = definition?.canvas;

  // `components` is optional in the schema: a definition may draw everything on
  // the canvas.
  if (
    typeof definition !== 'object' ||
    definition === null ||
    typeof canvas !== 'object' ||
    canvas === null ||
    typeof canvas.width !== 'number' ||
    typeof canvas.height !== 'number' ||
    (definition.components !== undefined && typeof definition.components !== 'object')
  ) {
    throw new Error('The selected file does not look like a DiceBear definition file.');
  }

  if (canvas.width <= 0 || canvas.width !== canvas.height) {
    throw new Error('The definition canvas must be square.');
  }
}

async function ensureEmptyTarget(): Promise<void> {
  // The style check needs no page loading, so it rejects a real style file
  // before the expensive full document load.
  const paintStyles = await figma.getLocalPaintStylesAsync();

  if (paintStyles.some(isSupportedColor)) {
    throw new Error('This file already contains color styles with group names. Import definitions into an empty file.');
  }

  await figma.loadAllPagesAsync();

  const components = figma.root.findAllWithCriteria({ types: ['COMPONENT'] });

  if (components.some(isSupportedComponent)) {
    throw new Error('This file already contains component groups. Import definitions into an empty file.');
  }
}

function createPaintStyles(definition: DefinitionFile, warn: (message: string) => void): Map<string, PaintStyle[]> {
  const stylesByGroup = new Map<string, PaintStyle[]>();

  for (const [groupName, group] of Object.entries(definition.colors ?? {})) {
    const values = group.values ?? [];
    // The zero-padded index keeps the palette order stable: the exporter sorts
    // colors by name before writing the definition values.
    const padLength = Math.max(2, String(values.length).length);

    const styles = values.map((hex, index) => {
      const style = figma.createPaintStyle();

      style.name = `${groupName}/${String(index + 1).padStart(padLength, '0')} ${hex.replace('#', '').toLowerCase()}`;

      try {
        style.paints = [figma.util.solidPaint(hex)];
      } catch {
        // Aborting here would leave the half built file behind, and the next
        // attempt would be rejected as non-empty.
        warn(`palette "${groupName}": the value "${hex}" could not be parsed, black was used instead.`);
        style.paints = [figma.util.solidPaint('#000000')];
      }

      return style;
    });

    stylesByGroup.set(groupName, styles);
  }

  return stylesByGroup;
}

function solidPaintHex(paint: Paint): string | null {
  if (paint.type !== 'SOLID') {
    return null;
  }

  const to255 = (value: number) =>
    Math.round(value * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${to255(paint.color.r)}${to255(paint.color.g)}${to255(paint.color.b)}`;
}

type PaintBinding = {
  /** Alpha of the paint before the binding replaces it. */
  alpha: number;
  bind: () => Promise<void>;
};

/**
 * The paint alpha a layer can carry as its own opacity, or null when it has to
 * be dropped. A layer bound to a color style takes the style's paint, alpha
 * included, so `fill-opacity` and `stroke-opacity` have nowhere else to go.
 * Layer opacity is applied after the color rather than to it, which makes it an
 * exact stand-in, but it dims everything the layer draws. That only matches the
 * original when the bound paints are all the layer has: they must share one
 * alpha, nothing may paint beside them, and no nested content, effect or
 * existing opacity may ride along.
 */
function getMovableAlpha(node: SceneNode, boundPaints: PaintBinding[], unboundPaints: number): number | null {
  const alpha = boundPaints[0].alpha;

  if (alpha === 1 || unboundPaints > 0 || boundPaints.some((paint) => paint.alpha !== alpha)) {
    return null;
  }

  if (false === 'opacity' in node || node.opacity !== 1) {
    return null;
  }

  if ('children' in node && node.children.length > 0) {
    return null;
  }

  if ('effects' in node && node.effects.length > 0) {
    return null;
  }

  return alpha;
}

async function bindColorStyles(
  root: FrameNode,
  bindings: Map<string, string>,
  warnOnce: (message: string) => void,
): Promise<void> {
  const nodes: SceneNode[] = [root, ...root.findAll()];
  const writes: Promise<void>[] = [];
  let movedOpacity = false;
  let droppedOpacity = false;

  for (const node of nodes) {
    const boundPaints: PaintBinding[] = [];
    let unboundPaints = 0;

    if ('fills' in node) {
      const fills = node.fills;
      const paint = Array.isArray(fills) && fills.length === 1 ? fills[0] : null;
      const hex = paint ? solidPaintHex(paint) : null;
      const styleId = hex ? bindings.get(hex) : undefined;

      if (paint && styleId) {
        boundPaints.push({ alpha: paint.opacity ?? 1, bind: () => node.setFillStyleIdAsync(styleId) });
      } else {
        // Figma's mixed value is not an array and stands for paints this pass
        // cannot read, so it counts as one that stays behind.
        unboundPaints += Array.isArray(fills) ? fills.length : 1;
      }
    }

    if ('strokes' in node) {
      const paint = node.strokes.length === 1 ? node.strokes[0] : null;
      const hex = paint ? solidPaintHex(paint) : null;
      const styleId = hex ? bindings.get(hex) : undefined;

      if (paint && styleId) {
        boundPaints.push({ alpha: paint.opacity ?? 1, bind: () => node.setStrokeStyleIdAsync(styleId) });
      } else {
        unboundPaints += node.strokes.length;
      }
    }

    if (boundPaints.length === 0) {
      continue;
    }

    const movableAlpha = getMovableAlpha(node, boundPaints, unboundPaints);

    if (movableAlpha !== null && 'opacity' in node) {
      node.opacity = movableAlpha;
      movedOpacity = true;
    } else if (boundPaints.some((paint) => paint.alpha < 1)) {
      droppedOpacity = true;
    }

    for (const paint of boundPaints) {
      writes.push(paint.bind());
    }
  }

  await Promise.all(writes);

  if (droppedOpacity) {
    warnOnce(
      'Some layers combine a palette color with their own fill-opacity or stroke-opacity. ' +
        (movedOpacity ? 'Where that alpha covers everything the layer draws, it became the layer opacity. ' : '') +
        'The rest were imported fully opaque, a layer bound to a color style has no other place for it.',
    );
  }
}

type SentinelColor = {
  style?: PaintStyle;
  paint?: SolidPaint;
};

/** Turns the color a reference passes down into something Figma can paint. */
function resolveSentinelColor(
  color: PreparedRefColor | undefined,
  context: ImportContext,
  onUnparsable?: (value: string) => void,
): SentinelColor {
  const style = color?.group ? context.paintStylesByGroup.get(color.group)?.[0] : undefined;
  let paint: SolidPaint | undefined;

  if (!style && color?.value) {
    try {
      paint = figma.util.solidPaint(color.value);
    } catch {
      onUnparsable?.(color.value);
    }
  }

  return { style, paint };
}

/**
 * Repaints every layer below `root` that still carries the `currentColor`
 * sentinel. `skipInstances` keeps the pass off nodes that belong to a nested
 * component, those are resolved through their own main component.
 */
async function paintSentinelLayers(
  root: SceneNode & ChildrenMixin,
  color: SentinelColor,
  context: ImportContext,
  skipInstances: boolean,
  onMissing?: () => void,
): Promise<void> {
  const { style, paint } = color;

  if (!style && !paint && !onMissing) {
    return;
  }

  for (const node of root.findAll()) {
    if (skipInstances && isInsideInstance(node, root)) {
      continue;
    }

    if ('fills' in node && Array.isArray(node.fills) && node.fills.length === 1) {
      if (solidPaintHex(node.fills[0]) === context.currentColorSentinel) {
        if (style) {
          await node.setFillStyleIdAsync(style.id);
        } else if (paint) {
          node.fills = [paint];
        } else {
          onMissing?.();
        }
      }
    }

    if ('strokes' in node && node.strokes.length === 1) {
      if (solidPaintHex(node.strokes[0]) === context.currentColorSentinel) {
        if (style) {
          await node.setStrokeStyleIdAsync(style.id);
        } else if (paint) {
          node.strokes = [paint];
        } else {
          onMissing?.();
        }
      }
    }
  }
}

/**
 * Resolves the `currentColor` sentinel inside one instance. Layers keep the
 * sentinel paint until either this override or the final pass over the main
 * components replaces it.
 */
async function applyReferenceColor(
  instance: InstanceNode,
  color: PreparedRefColor,
  context: ImportContext,
): Promise<void> {
  const resolved = resolveSentinelColor(color, context, (value) =>
    context.warnOnce(`The color "${value}" on a component reference could not be parsed and was dropped.`),
  );

  if (!resolved.style && !resolved.paint) {
    return;
  }

  await paintSentinelLayers(instance, resolved, context, false);
}

async function replaceRefPlaceholders(
  root: FrameNode,
  refs: PreparedRef[],
  context: ImportContext,
  scope: string,
): Promise<void> {
  for (const ref of refs) {
    const placeholder = root.findOne((node) => node.name === ref.id);

    if (!placeholder || !placeholder.parent) {
      context.warn(`${scope}: the reference to "${ref.refName}" was lost during the SVG import.`);

      continue;
    }

    const masterName = resolveMasterName(context.components, ref.refName);
    const mainComponent = masterName === null ? undefined : context.componentIndex.get(masterName);
    const parent = placeholder.parent as BaseNode & ChildrenMixin;

    if (!mainComponent) {
      context.warn(`${scope}: the reference to "${ref.refName}" was removed because the component was not imported.`);
      placeholder.remove();

      continue;
    }

    const index = parent.children.indexOf(placeholder);
    const instance = mainComponent.createInstance();

    // Insert before removing the placeholder, otherwise a group that only
    // holds the placeholder would dissolve.
    parent.insertChild(index, instance);
    // Figma rejects a resize below 0.01, which a reference scaled to zero would
    // ask for.
    instance.resize(Math.max(placeholder.width, 0.01), Math.max(placeholder.height, 0.01));
    instance.relativeTransform = placeholder.relativeTransform;

    if ('opacity' in placeholder) {
      instance.opacity = placeholder.opacity;
    }

    if (masterName !== ref.refName) {
      // Renaming the instance to the alias name is what the exporter reads
      // back as an alias component.
      instance.name = ref.refName;
    }

    if (ref.color) {
      context.warnOnce(
        'Colors set on component references cannot round-trip: an export from this file will use each ' +
          "component's own color instead.",
      );
      await applyReferenceColor(instance, ref.color, context);
    }

    placeholder.remove();
  }
}

function prepareComponents(
  components: DefinitionComponents,
  serializer: DefinitionSerializer,
  warn: (message: string) => void,
): Map<string, PreparedGroup> {
  const prepared = new Map<string, PreparedGroup>();

  for (const [groupName, entry] of Object.entries(components)) {
    if ('extends' in entry) {
      continue;
    }

    const variants: PreparedVariant[] = [];
    const emptyVariantWarnings: string[] = [];

    for (const [variantName, variant] of Object.entries(entry.variants ?? {})) {
      const scope = `component "${groupName}" variant "${variantName}"`;
      const serialized = serializer.serialize(variant.elements ?? [], entry.width, entry.height, scope);

      if (serialized.svg === null) {
        emptyVariantWarnings.push(`${scope} is empty after skipping unsupported content and was not imported.`);

        continue;
      }

      variants.push({ name: variantName, svg: serialized.svg, refs: serialized.refs });
    }

    if (variants.length === 0) {
      warn(
        `component "${groupName}": every variant is empty after skipping unsupported content, the component was not imported.`,
      );

      continue;
    }

    emptyVariantWarnings.forEach(warn);
    prepared.set(groupName, { name: groupName, variants });
  }

  return prepared;
}

function sortGroupsByDependencies(prepared: Map<string, PreparedGroup>, components: DefinitionComponents): string[] {
  const order: string[] = [];
  const state = new Map<string, 'visiting' | 'done'>();

  const visit = (name: string): void => {
    const current = state.get(name);

    if (current === 'done') {
      return;
    }

    if (current === 'visiting') {
      throw new Error(`Circular component references involving "${name}" cannot be imported.`);
    }

    state.set(name, 'visiting');

    const group = prepared.get(name);

    if (group) {
      for (const variant of group.variants) {
        for (const ref of variant.refs) {
          const masterName = resolveMasterName(components, ref.refName);

          if (masterName !== null && prepared.has(masterName)) {
            visit(masterName);
          }
        }
      }

      order.push(name);
    }

    state.set(name, 'done');
  };

  for (const name of prepared.keys()) {
    visit(name);
  }

  return order;
}

/**
 * The color each main component should fall back to for its `currentColor`
 * layers: the color that most references to it pass down.
 */
function voteFallbackColors(allRefs: PreparedRef[], components: DefinitionComponents): Map<string, PreparedRefColor> {
  const votes = new Map<string, Map<string, { color: PreparedRefColor; count: number }>>();

  for (const ref of allRefs) {
    if (!ref.color) {
      continue;
    }

    const masterName = resolveMasterName(components, ref.refName);

    if (masterName === null) {
      continue;
    }

    const key = ref.color.group ? `group:${ref.color.group}` : `value:${ref.color.value}`;
    const groupVotes = votes.get(masterName) ?? new Map();
    const entry = groupVotes.get(key) ?? { color: ref.color, count: 0 };

    entry.count++;
    groupVotes.set(key, entry);
    votes.set(masterName, groupVotes);
  }

  const result = new Map<string, PreparedRefColor>();

  for (const [masterName, groupVotes] of votes) {
    let best: { color: PreparedRefColor; count: number } | undefined;

    for (const entry of groupVotes.values()) {
      if (!best || entry.count > best.count) {
        best = entry;
      }
    }

    if (best) {
      result.set(masterName, best.color);
    }
  }

  return result;
}

/**
 * References carry their scale as the size of the instance that replaces the
 * placeholder, which is also how the export reads it back. Without scaling
 * constraints the instance frame would grow while its artwork stayed at the
 * original size, so they are set explicitly instead of relying on what the SVG
 * import happened to assign. Groups have no constraints of their own, their
 * children carry them.
 */
function applyScaleConstraints(component: ComponentNode): void {
  for (const node of component.findAll()) {
    // Constraints cannot be overridden inside an instance. The instance node
    // itself still gets them, it scales as a whole.
    if (isInsideInstance(node, component)) {
      continue;
    }

    if ('constraints' in node) {
      node.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
    }
  }
}

function isInsideInstance(node: BaseNode, root: SceneNode): boolean {
  let current = node.parent;

  while (current && current !== root) {
    if (current.type === 'INSTANCE') {
      return true;
    }

    current = current.parent;
  }

  return false;
}

/**
 * Resolves `currentColor` layers that are still on the sentinel color inside
 * the main components. Instances that received a per-reference override keep
 * it, all others inherit this fallback.
 */
async function bindRemainingCurrentColor(
  fallbackColors: Map<string, PreparedRefColor>,
  componentsByGroup: Map<string, ComponentNode[]>,
  context: ImportContext,
): Promise<void> {
  for (const [groupName, components] of componentsByGroup) {
    const resolved = resolveSentinelColor(fallbackColors.get(groupName), context);

    for (const component of components) {
      await paintSentinelLayers(component, resolved, context, true, () =>
        context.warnOnce(
          `component "${groupName}" uses currentColor without an inherited color, the affected layers kept a placeholder color.`,
        ),
      );
    }
  }
}

export async function importDefinition(definition: DefinitionFile, styleName: string): Promise<string[]> {
  validateDefinition(definition);
  await ensureEmptyTarget();

  figma.commitUndo();

  // The pages the file already had. Only a fresh file's single empty default
  // page is removed at the end, pages the user created stay.
  const startPages = [...figma.root.children];
  const components: DefinitionComponents = definition.components ?? {};
  const warnings: string[] = [];
  const warnedOnce = new Set<string>();
  const warn = (message: string) => warnings.push(message);
  const warnOnce = (message: string) => {
    if (!warnedOnce.has(message)) {
      warnedOnce.add(message);
      warnings.push(message);
    }
  };
  const serializer = createDefinitionSerializer(definition, warn);

  // Everything is serialized before the first node is created. An error in
  // here then leaves the file untouched, while a half built file would be
  // rejected as non-empty on the next attempt.
  const prepared = prepareComponents(components, serializer, warn);
  const order = sortGroupsByDependencies(prepared, components);

  const canvas = definition.canvas;
  const canvasSerialized = serializer.serialize(canvas.elements ?? [], canvas.width, canvas.height, 'canvas');

  await postProgress('Creating color styles');

  const paintStylesByGroup = createPaintStyles(definition, warn);
  const bindings = new Map<string, string>();

  for (const [groupName, sentinel] of serializer.sentinelByColorGroup) {
    const styles = paintStylesByGroup.get(groupName);

    if (styles && styles.length > 0) {
      bindings.set(sentinel, styles[0].id);
    }
  }

  const allRefs: PreparedRef[] = [...canvasSerialized.refs];

  for (const group of prepared.values()) {
    for (const variant of group.variants) {
      allRefs.push(...variant.refs);
    }
  }

  const fallbackColors = voteFallbackColors(allRefs, components);

  const componentIndex = new Map<string, ComponentNode>();
  const componentsByGroup = new Map<string, ComponentNode[]>();
  const createdVariants = new Map<string, string[]>();

  const context: ImportContext = {
    components,
    componentIndex,
    paintStylesByGroup,
    currentColorSentinel: serializer.currentColorSentinel,
    warn,
    warnOnce,
  };

  const avatarPage = figma.createPage();
  avatarPage.name = 'Avatar';

  const componentsPage = figma.createPage();
  componentsPage.name = 'Components';

  let cursorY = 0;

  for (let groupIndex = 0; groupIndex < order.length; groupIndex++) {
    const group = prepared.get(order[groupIndex])!;

    await postProgress(`Importing component ${groupIndex + 1} of ${order.length}: ${group.name}`);

    let x = 0;
    let rowY = cursorY;
    let rowHeight = 0;

    for (const variant of group.variants) {
      let svgFrame: FrameNode;

      try {
        svgFrame = figma.createNodeFromSvg(variant.svg);
      } catch (e: any) {
        warn(`component "${group.name}" variant "${variant.name}": Figma could not parse the SVG (${e.message}).`);

        continue;
      }

      componentsPage.appendChild(svgFrame);
      await bindColorStyles(svgFrame, bindings, warnOnce);
      await replaceRefPlaceholders(
        svgFrame,
        variant.refs,
        context,
        `component "${group.name}" variant "${variant.name}"`,
      );

      const component = figma.createComponentFromNode(svgFrame);

      component.name = `${group.name}/${variant.name}`;
      applyScaleConstraints(component);

      if (x > 0 && x + component.width > MAX_ROW_WIDTH) {
        x = 0;
        rowY += rowHeight + COMPONENT_GAP;
        rowHeight = 0;
      }

      component.x = x;
      component.y = rowY;
      rowHeight = Math.max(rowHeight, component.height);
      x += component.width + COMPONENT_GAP;

      if (!componentIndex.has(group.name)) {
        componentIndex.set(group.name, component);
      }

      const siblings = componentsByGroup.get(group.name) ?? [];

      siblings.push(component);
      componentsByGroup.set(group.name, siblings);

      const names = createdVariants.get(group.name) ?? [];

      names.push(variant.name);
      createdVariants.set(group.name, names);

      await tick();
    }

    cursorY = rowY + rowHeight + GROUP_GAP;
  }

  await postProgress('Building the avatar frame');

  let imported: FrameNode | null = null;

  if (canvasSerialized.svg !== null) {
    try {
      imported = figma.createNodeFromSvg(canvasSerialized.svg);
    } catch (e: any) {
      // Aborting here would leave the components and color styles behind, and
      // the next attempt would be rejected as non-empty.
      warn(`canvas: Figma could not parse the SVG (${e.message}), the avatar frame was left empty.`);
    }
  }

  let frame: FrameNode;

  if (imported) {
    frame = imported;
    avatarPage.appendChild(frame);
    await bindColorStyles(frame, bindings, warnOnce);
    await replaceRefPlaceholders(frame, canvasSerialized.refs, context, 'canvas');
  } else {
    frame = figma.createFrame();
    frame.resize(canvas.width, canvas.height);
    frame.fills = [];
    avatarPage.appendChild(frame);
  }

  await bindRemainingCurrentColor(fallbackColors, componentsByGroup, context);

  // On the canvas there is no element left to inherit from, so the SVG default
  // for `color` applies. Without this the layers would keep the sentinel.
  await paintSentinelLayers(frame, { paint: figma.util.solidPaint('#000000') }, context, true);

  const meta = definition.meta ?? {};
  // The file name, not `meta.source.name`: the source names the artwork the
  // style is based on, which is a credit rather than the style's own name.
  const title = styleName;

  frame.name = title;
  frame.x = 0;
  frame.y = 0;

  // A background layer bound to the background palette makes the frame usable
  // as it is, for people who copy it without ever running the plugin. The
  // export ignores layers bound to the configured background group.
  const backgroundStyle = paintStylesByGroup.get('background')?.[0];

  if (backgroundStyle) {
    const background = figma.createRectangle();

    background.name = 'background';
    frame.insertChild(0, background);
    background.resize(frame.width, frame.height);
    background.x = 0;
    background.y = 0;
    background.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
    await background.setFillStyleIdAsync(backgroundStyle.id);
  }

  for (const groupName of Object.keys(definition.colors ?? {})) {
    if (groupName !== 'background' && !serializer.usedColorGroups.has(groupName)) {
      warn(`palette "${groupName}" is not used by any imported layer and will not survive an export.`);
    }
  }

  await postProgress('Writing settings');

  const shapeRendering = definition.attributes?.['shape-rendering'];

  setFrameSettings(frame, {
    dicebearVersion: '10.x',
    title,
    packageName: '',
    packageVersion: '',
    creator: meta.creator?.name ?? '',
    homepage: meta.creator?.url ?? '',
    sourceTitle: meta.source?.name ?? '',
    source: meta.source?.url ?? '',
    licenseName: meta.license?.name ?? '',
    licenseUrl: meta.license?.url ?? '',
    licenseText: meta.license?.text ?? '',
    backgroundColorGroupName: definition.colors?.background ? 'background' : '',
    shapeRendering: typeof shapeRendering === 'string' ? shapeRendering : 'auto',
    onPreCreateHook: '',
    onPostCreateHook: '',
    precision: 3,
    fileShareUrl: '',
  });

  for (const [groupName, variantNames] of createdVariants) {
    const entry = components[groupName] as DefinitionComponentBase;
    const settings: ComponentGroupSettings = {
      defaults: {},
      weights: {},
      tags: {},
      probability: entry.probability ?? null,
      rotation: entry.rotate ?? null,
      scale: entry.scale ?? null,
      translateX: entry.translate?.x ?? null,
      translateY: entry.translate?.y ?? null,
    };

    for (const variantName of variantNames) {
      const variant = entry.variants[variantName];

      settings.defaults[variantName] = true;
      settings.weights[variantName] = variant?.weight ?? 1;
      settings.tags[variantName] = variant?.tags ?? [];
    }

    setComponentGroupSettings(frame, groupName, settings);
  }

  for (const [groupName, group] of Object.entries(definition.colors ?? {})) {
    const notEqualTo: Record<string, boolean> = {};

    for (const other of group.notEqualTo ?? []) {
      notEqualTo[other] = true;
    }

    setColorGroupSettings(frame, groupName, {
      notEqualTo,
      contrastTo: group.contrastTo ?? null,
    });
  }

  await postProgress('Building the thumbnail');

  const thumbnailPage = figma.createPage();

  thumbnailPage.name = 'Thumbnail';

  try {
    await createThumbnail(thumbnailPage, {
      definition,
      title,
      warnOnce,
      progress: postProgress,
    });
    figma.root.insertChild(0, thumbnailPage);
  } catch (e: any) {
    thumbnailPage.remove();
    warn(`The thumbnail could not be created (${e.message}).`);
  }

  await postProgress('Adding the guide');

  let guide: SceneNode | null = null;

  try {
    guide = await createGuide(avatarPage, frame, { paintStylesByGroup, warnOnce });
  } catch (e: any) {
    warn(`The guide could not be created (${e.message}).`);
  }

  await figma.setCurrentPageAsync(avatarPage);

  // The empty default page a fresh file starts with. A file the user already
  // set up keeps its pages, empty ones included.
  if (startPages.length === 1 && startPages[0].children.length === 0) {
    startPages[0].remove();
  }

  avatarPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView(guide ? [frame, guide] : [frame]);

  const uniqueWarnings = [...new Set(warnings)];

  figma.notify(
    uniqueWarnings.length > 0
      ? `Imported "${title}" with ${uniqueWarnings.length} warning${uniqueWarnings.length === 1 ? '' : 's'}.`
      : `Imported "${title}".`,
  );

  return uniqueWarnings;
}
