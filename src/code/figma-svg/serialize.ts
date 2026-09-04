import { stringify, type INode } from 'svgson';

import { blendModeStyle } from './blend';
import { element } from './element';
import { effectsToFilter, type FilterBox } from './effects';
import { planMaskedSiblings, type MaskPlanItem } from './masks';
import { IDENTITY, fromTransform, isIdentity, isTranslation, toAttribute, type Matrix } from './matrix';
import { formatNumber } from './numbers';
import { resolvePaint } from './paints';
import type { ChannelPaint, PaintChannel, SerializeContext, SerializeHooks, SerializeOptions } from './types';

/**
 * Writes the SVG of a frame or a component straight from the layer data.
 *
 * Geometry comes from `fillGeometry` and `strokeGeometry`, which already
 * account for corner smoothing, stroke alignment, caps, joins and dashes.
 * Paints, effects, masks, blend modes and transforms are translated one to
 * one. Three hooks let a caller take over a layer, a bound style, or the
 * finished elements of a layer, see {@link SerializeHooks}.
 *
 * The root is exported by its contents: its own fill and transform stay out,
 * like `exportAsync` with `contentsOnly`.
 */

type Context = SerializeContext & {
  hooks: SerializeHooks;
  clipFrames: boolean;
  lastYield: number;
};

/** How long the walk may hold the thread before it yields, in milliseconds. */
const YIELD_AFTER_MS = 12;

const defaultYield = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** Lets the event loop turn once the walk has held the thread long enough. */
async function breathe(ctx: Context): Promise<void> {
  if (Date.now() - ctx.lastYield < YIELD_AFTER_MS) {
    return;
  }

  await (ctx.host.yield ?? defaultYield)();
  ctx.lastYield = Date.now();
}

type Size = { width: number; height: number };

/**
 * How a layer is being rendered: as ordinary content, as the content of an
 * alpha or luminance mask (as it paints), or as the content of a vector mask
 * (its white outline). Decided once at the mask and passed down, since the
 * children of a group mask carry no mask type of their own.
 */
type MaskMode = false | 'paint' | 'outline';

const SHAPE_TYPES = new Set<string>([
  'RECTANGLE',
  'ELLIPSE',
  'POLYGON',
  'STAR',
  'VECTOR',
  'LINE',
  'TEXT',
  'BOOLEAN_OPERATION',
]);

const CONTAINER_TYPES = new Set<string>(['GROUP', 'FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'SECTION']);

function paintAttributes(channel: PaintChannel, paint: ChannelPaint): Record<string, string> {
  const attributes: Record<string, string> = { [channel]: paint.value };

  if (paint.opacity !== undefined) {
    attributes[`${channel}-opacity`] = formatNumber(paint.opacity);
  }

  return attributes;
}

function pathElement(path: VectorPath, attributes: Record<string, string>): INode {
  const result: Record<string, string> = { d: path.data, ...attributes };

  if (path.windingRule === 'EVENODD') {
    result['fill-rule'] = 'evenodd';
    result['clip-rule'] = 'evenodd';
  }

  return element('path', result);
}

async function channelPaints(ctx: Context, node: SceneNode & GeometryMixin, channel: PaintChannel, size: Size) {
  const styleId = channel === 'fill' ? node.fillStyleId : node.strokeStyleId;

  if (typeof styleId === 'string' && styleId !== '' && ctx.hooks.resolveStyle) {
    const resolved = await ctx.hooks.resolveStyle(node, channel, styleId, ctx);

    if (resolved !== undefined) {
      return resolved;
    }
  }

  const paints = channel === 'fill' ? node.fills : node.strokes;

  if (paints === ctx.host.mixed) {
    ctx.warn(`The layer "${node.name}" mixes several ${channel}s in one text and was exported without them.`);

    return [];
  }

  return ctx.resolvePaints((paints as ReadonlyArray<Paint>) ?? [], size);
}

type Primitive = { name: 'rect' | 'ellipse' | 'circle'; attributes: Record<string, string> };

/**
 * The SVG primitive a layer is, when it is one. A rectangle with one radius
 * and no corner smoothing is a `<rect>`, a full ellipse a `<circle>` or an
 * `<ellipse>`. Everything else stays a path from the geometry.
 */
function primitiveOf(ctx: Context, node: SceneNode): Primitive | null {
  if (node.type === 'RECTANGLE') {
    if (node.cornerRadius === ctx.host.mixed) {
      return null;
    }

    const cornerRadius = node.cornerRadius as number;

    if (cornerRadius > 0 && node.cornerSmoothing > 0) {
      return null;
    }

    const attributes: Record<string, string> = {
      width: formatNumber(node.width),
      height: formatNumber(node.height),
    };
    const radius = Math.min(cornerRadius, node.width / 2, node.height / 2);

    if (radius > 0) {
      attributes.rx = formatNumber(radius);
    }

    return { name: 'rect', attributes };
  }

  if (node.type === 'ELLIPSE') {
    const arc = node.arcData;
    const sweep = Math.abs(arc.endingAngle - arc.startingAngle);

    if (arc.innerRadius !== 0 || sweep < Math.PI * 2 - 1e-6) {
      return null;
    }

    const rx = node.width / 2;
    const ry = node.height / 2;

    if (Math.abs(rx - ry) < 1e-6) {
      return { name: 'circle', attributes: { cx: formatNumber(rx), cy: formatNumber(ry), r: formatNumber(rx) } };
    }

    return {
      name: 'ellipse',
      attributes: { cx: formatNumber(rx), cy: formatNumber(ry), rx: formatNumber(rx), ry: formatNumber(ry) },
    };
  }

  return null;
}

/** Moves a pure translation into a primitive's position attributes. */
function placePrimitive(primitive: INode, matrix: Matrix): void {
  if (primitive.name === 'rect') {
    primitive.attributes.x = formatNumber(matrix.e);
    primitive.attributes.y = formatNumber(matrix.f);
  } else {
    primitive.attributes.cx = formatNumber(Number(primitive.attributes.cx) + matrix.e);
    primitive.attributes.cy = formatNumber(Number(primitive.attributes.cy) + matrix.f);
  }
}

/**
 * Whether the stroke can travel as `stroke` attributes on the geometry. Figma
 * draws a center stroke the way SVG does, an inside or outside stroke and the
 * arrow caps have no attribute form and use the outlined `strokeGeometry`.
 */
function strokeAsAttributes(ctx: Context, node: SceneNode & GeometryMixin, strokes: ChannelPaint[]): boolean {
  if (node.type === 'TEXT' || node.type === 'BOOLEAN_OPERATION' || strokes.length !== 1) {
    return false;
  }

  if (node.strokeAlign !== 'CENTER' || node.strokeWeight === ctx.host.mixed) {
    return false;
  }

  const cap = node.strokeCap;

  return cap === 'NONE' || cap === 'ROUND' || cap === 'SQUARE';
}

function strokeAttributes(node: SceneNode & GeometryMixin, stroke: ChannelPaint): Record<string, string> {
  const attributes = paintAttributes('stroke', stroke);

  attributes['stroke-width'] = formatNumber(node.strokeWeight as number);

  if (node.strokeCap === 'ROUND') {
    attributes['stroke-linecap'] = 'round';
  } else if (node.strokeCap === 'SQUARE') {
    attributes['stroke-linecap'] = 'square';
  }

  if (node.strokeJoin === 'ROUND') {
    attributes['stroke-linejoin'] = 'round';
  } else if (node.strokeJoin === 'BEVEL') {
    attributes['stroke-linejoin'] = 'bevel';
  } else if (node.strokeMiterLimit !== 4) {
    attributes['stroke-miterlimit'] = formatNumber(node.strokeMiterLimit);
  }

  if (node.dashPattern.length > 0) {
    attributes['stroke-dasharray'] = node.dashPattern.map((v) => formatNumber(v)).join(' ');
  }

  return attributes;
}

/** The centerline a stroke runs along, in the layer's own coordinates. */
function centerline(node: SceneNode & GeometryMixin, fillGeometry: VectorPaths): VectorPaths {
  if (node.type === 'VECTOR') {
    return node.vectorPaths;
  }

  if (node.type === 'LINE') {
    return [{ windingRule: 'NONE', data: `M 0 0 L ${formatNumber(node.width)} 0` }];
  }

  return fillGeometry;
}

/**
 * The elements that draw a shape layer, in its own coordinates. One element
 * per fill paint, a stroke on the same element when it is the only one and the
 * stroke has an attribute form, outlined stroke paths otherwise. `outlineOnly`
 * paints the geometry white without a stroke, the way a vector mask uses its
 * outline.
 */
async function shapeElements(
  ctx: Context,
  node: SceneNode & GeometryMixin,
  outlineOnly: boolean,
  primitive: Primitive | null,
): Promise<INode[]> {
  const size: Size = { width: node.width, height: node.height };
  const fills = outlineOnly ? [{ value: '#ffffff' }] : await channelPaints(ctx, node, 'fill', size);
  const strokes = outlineOnly || node.strokeWeight === 0 ? [] : await channelPaints(ctx, node, 'stroke', size);

  // Most containers carry no paint at all, and a primitive never needs its
  // outline, so the geometry is computed on read only where a path comes out.
  if (fills.length === 0 && strokes.length === 0) {
    return [];
  }

  let fillGeometry: VectorPaths | undefined;
  const outline = (): VectorPaths => (fillGeometry ??= node.fillGeometry);
  const elements: INode[] = [];

  /** One primitive, or one path per subpath of the geometry. */
  const draw = (attributes: Record<string, string>, paths: () => VectorPaths): INode[] =>
    primitive !== null
      ? [element(primitive.name, { ...primitive.attributes, ...attributes })]
      : paths().map((path) => pathElement(path, attributes));

  for (const fill of fills) {
    elements.push(...draw(paintAttributes('fill', fill), outline));
  }

  if (strokes.length === 0) {
    return elements;
  }

  if (strokeAsAttributes(ctx, node, strokes)) {
    const attributes = strokeAttributes(node, strokes[0]);
    const line = primitive !== null ? [] : centerline(node, outline());

    // A single filled element that follows the same outline takes the stroke
    // itself. A vector's fill geometry can differ from its centerline (an
    // open path fills nothing), so those get a stroke element of their own.
    if (
      elements.length === 1 &&
      (primitive !== null || (node.type !== 'VECTOR' && outline().length === 1 && line.length === 1))
    ) {
      Object.assign(elements[0].attributes, attributes);

      return elements;
    }

    elements.push(...draw({ fill: 'none', ...attributes }, () => line));

    return elements;
  }

  // Outlined strokes are filled shapes, so they never take the primitive form.
  const strokeGeometry = node.strokeGeometry;

  for (const stroke of strokes) {
    for (const path of strokeGeometry) {
      elements.push(pathElement(path, paintAttributes('fill', stroke)));
    }
  }

  return elements;
}

/**
 * Puts the layer's transform, opacity and blend mode on its elements: on the
 * element itself when there is one, on a group around them otherwise. A pure
 * translation moves into a primitive's position instead of a transform. An
 * element that already carries a transform of its own keeps it inside the
 * layer's.
 */
function placeElements(
  elements: INode[],
  matrix: Matrix,
  attributes: Record<string, string>,
  primitive: boolean,
): INode[] {
  if (elements.length === 0) {
    return [];
  }

  const transform = toAttribute(matrix);

  // A single element takes the layer's attributes itself, unless it already
  // carries one of them. A child's opacity or blend mode composes with the
  // layer's, so that case gets a group.
  if (
    elements.length === 1 &&
    elements[0].type === 'element' &&
    !Object.keys(attributes).some((key) => key in elements[0].attributes)
  ) {
    const [only] = elements;

    // Outlined strokes leave a primitive layer as paths, which have no
    // position attributes to move.
    if (primitive && only.name !== 'path' && isTranslation(matrix)) {
      if (!isIdentity(matrix)) {
        placePrimitive(only, matrix);
      }
    } else if (transform !== undefined) {
      only.attributes.transform =
        only.attributes.transform === undefined ? transform : `${transform} ${only.attributes.transform}`;
    }

    Object.assign(only.attributes, attributes);

    return [only];
  }

  const groupAttributes: Record<string, string> = { ...attributes };

  if (transform !== undefined) {
    groupAttributes.transform = transform;
  }

  // Nothing to carry, so no group: the elements stand as siblings.
  if (Object.keys(groupAttributes).length === 0) {
    return elements;
  }

  return [element('g', groupAttributes, elements)];
}

/** Opacity and blend mode as attributes, for a layer that is not a mask. */
function blendAttributes(ctx: Context, node: SceneNode, asMask: boolean): Record<string, string> {
  const attributes: Record<string, string> = {};

  if (asMask) {
    return attributes;
  }

  if ('opacity' in node && node.opacity !== 1) {
    attributes.opacity = formatNumber(node.opacity);
  }

  if ('blendMode' in node) {
    const style = blendModeStyle(node.blendMode, ctx.warn);

    if (style !== undefined) {
      attributes.style = style;
    }
  }

  return attributes;
}

/** How far a shape's stroke reaches beyond its box. */
function strokeOutset(ctx: Context, node: SceneNode & GeometryMixin): number {
  const strokes = node.strokes;

  if (strokes === ctx.host.mixed || !strokes.some((stroke) => stroke.visible !== false)) {
    return 0;
  }

  const weight =
    node.strokeWeight !== ctx.host.mixed
      ? (node.strokeWeight as number)
      : 'strokeTopWeight' in node
        ? Math.max(node.strokeTopWeight, node.strokeRightWeight, node.strokeBottomWeight, node.strokeLeftWeight)
        : 0;

  if (node.strokeAlign === 'INSIDE') {
    return 0;
  }

  return node.strokeAlign === 'CENTER' ? weight / 2 : weight;
}

/**
 * Wraps the layer's elements in the filter for its effects, when it has any.
 * The elements are in the layer's own coordinates, so a shape's region can be
 * written in them, see {@link FilterBox}.
 */
function applyEffects(ctx: Context, node: SceneNode, elements: INode[], asMask: boolean): INode[] {
  if (asMask || elements.length === 0 || !('effects' in node) || node.effects.length === 0) {
    return elements;
  }

  const box: FilterBox = { width: node.width, height: node.height };

  if (SHAPE_TYPES.has(node.type)) {
    box.outset = strokeOutset(ctx, node as SceneNode & GeometryMixin);
  }

  const filter = effectsToFilter(node.effects, box, ctx.nextId('filter'), ctx.warn);

  if (filter === null) {
    return elements;
  }

  ctx.defs.push(filter);

  return [element('g', { filter: `url(#${filter.attributes.id})` }, elements)];
}

/**
 * The elements of a container: its own fill and stroke first, then the
 * children in layer order with masks applied. A frame that clips its content
 * gets a clip path from its outline, when the export clips frames at all.
 */
async function containerElements(ctx: Context, node: SceneNode & ChildrenMixin, mode: MaskMode): Promise<INode[]> {
  // A container's own fill and stroke, never in primitive form: its box is
  // the layout, and its children follow in the same coordinates.
  const own =
    'fillGeometry' in node ? await shapeElements(ctx, node as SceneNode & GeometryMixin, mode === 'outline', null) : [];
  const children = await serializeChildren(ctx, node.children, mode);

  if (ctx.clipFrames && 'clipsContent' in node && node.clipsContent && children.length > 0) {
    const id = ctx.nextId('clip');
    const outline = (node as SceneNode & GeometryMixin).fillGeometry;
    const shape =
      outline.length > 0
        ? outline.map((path) => pathElement(path, {}))
        : [element('rect', { width: formatNumber(node.width), height: formatNumber(node.height) })];

    ctx.defs.push(element('clipPath', { id }, shape));

    return [...own, element('g', { 'clip-path': `url(#${id})` }, children)];
  }

  return [...own, ...children];
}

async function serializeChildren(ctx: Context, children: readonly SceneNode[], mode: MaskMode): Promise<INode[]> {
  const plan = planMaskedSiblings(
    children.filter((child) => child.visible),
    (child) => 'isMask' in child && child.isMask,
  );

  return serializePlan(ctx, plan, mode);
}

async function serializePlan(ctx: Context, plan: MaskPlanItem<SceneNode>[], mode: MaskMode): Promise<INode[]> {
  const result: INode[] = [];

  for (const item of plan) {
    if (item.kind === 'node') {
      result.push(...(await serializeNode(ctx, item.node, mode)));

      continue;
    }

    const masked = await serializePlan(ctx, item.children, mode);

    if (masked.length === 0) {
      continue;
    }

    const maskType = 'maskType' in item.mask ? item.mask.maskType : 'ALPHA';
    const content = await serializeNode(ctx, item.mask, maskType === 'VECTOR' ? 'outline' : 'paint');

    // An empty mask hides everything it masks. That is what Figma shows, but
    // rarely what the designer meant, so it is reported.
    if (content.length === 0) {
      ctx.warn(`The mask "${item.mask.name}" has no content, so the layers it masks were not exported.`);

      continue;
    }

    const id = ctx.nextId('mask');
    const attributes: Record<string, string> = { id };

    // A vector mask uses its outline, an alpha mask its transparency. Both are
    // alpha masks to SVG, a luminance mask is the SVG default.
    if (maskType !== 'LUMINANCE') {
      attributes.style = 'mask-type:alpha';
    }

    ctx.defs.push(element('mask', attributes, content));
    result.push(element('g', { mask: `url(#${id})` }, masked));
  }

  return result;
}

/**
 * The elements of one layer in its parent's coordinates. A mask mode renders
 * the layer as mask content: a vector mask as its white outline, an alpha or
 * luminance mask as it paints, both without opacity, blend mode and effects.
 */
async function serializeNode(ctx: Context, node: SceneNode, mode: MaskMode): Promise<INode[]> {
  await breathe(ctx);

  const asMask = mode !== false;

  // Figma's export leaves a layer at zero opacity out, and so does this one.
  if (!asMask && 'opacity' in node && node.opacity === 0) {
    return [];
  }

  // A group has no coordinate system of its own: Figma places its children,
  // and the group itself, relative to the nearest frame. Its transform is
  // derived from theirs and must not be applied a second time.
  const matrix = node.type === 'GROUP' ? IDENTITY : fromTransform(node.relativeTransform);
  const attributes = blendAttributes(ctx, node, asMask);
  let raw = ctx.hooks.resolveNode ? await ctx.hooks.resolveNode(node, asMask, ctx) : undefined;
  let primitive: Primitive | null = null;

  if (raw !== undefined) {
    // The hook owns the layer.
  } else if (CONTAINER_TYPES.has(node.type)) {
    raw = await containerElements(ctx, node as SceneNode & ChildrenMixin, mode);
  } else if (SHAPE_TYPES.has(node.type)) {
    // A text keeps its glyphs even in a vector mask.
    const outlineOnly = mode === 'outline' && node.type !== 'TEXT';

    primitive = primitiveOf(ctx, node);
    raw = await shapeElements(ctx, node as SceneNode & GeometryMixin, outlineOnly, primitive);
  } else {
    ctx.warn(`The layer "${node.name}" (${node.type}) has no SVG equivalent and was not exported.`);

    return [];
  }

  // The filter wraps the elements before they are placed, so its region is in
  // the layer's coordinates and the layer's opacity applies to the shadows
  // too. A filtered primitive is a group by then and takes a transform.
  const filtered = applyEffects(ctx, node, raw, asMask);
  const placed = placeElements(filtered, matrix, attributes, primitive !== null && filtered === raw);

  return ctx.hooks.wrapNode ? ctx.hooks.wrapNode(node, placed, asMask, ctx) : placed;
}

function createContext(options: SerializeOptions): Context {
  const warn = options.warn ?? (() => {});
  const ids = new Map<string, number>();
  const nextId = (kind: string): string => {
    const count = ids.get(kind) ?? 0;

    ids.set(kind, count + 1);

    return `${kind}${count}`;
  };
  const ctx: Context = {
    host: options.host,
    hooks: options.hooks ?? {},
    warn,
    clipFrames: options.clipFrames ?? true,
    lastYield: Date.now(),
    defs: [],
    nextId,
    resolvePaints: (paints, size) => {
      const result: ChannelPaint[] = [];

      for (const paint of paints) {
        const resolved = resolvePaint(paint, size, (kind) => nextId(`paint_${kind}`), warn);

        if (resolved === null) {
          continue;
        }

        if (resolved.def) {
          ctx.defs.push(resolved.def);
        }

        result.push({ value: resolved.value, opacity: resolved.opacity });
      }

      return result;
    },
  };

  return ctx;
}

/** The `<svg>` tree of the root's contents, definitions last. */
export async function serializeTree(root: SceneNode & ChildrenMixin, options: SerializeOptions): Promise<INode> {
  const ctx = createContext(options);
  const body = await serializeChildren(ctx, root.children, false);
  const children = ctx.defs.length > 0 ? [...body, element('defs', {}, ctx.defs)] : body;

  return element(
    'svg',
    {
      width: formatNumber(root.width),
      height: formatNumber(root.height),
      viewBox: `0 0 ${formatNumber(root.width)} ${formatNumber(root.height)}`,
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
    },
    children,
  );
}

/** The SVG of the root's contents as a string. */
export async function serializeToSvg(root: SceneNode & ChildrenMixin, options: SerializeOptions): Promise<string> {
  return stringify(await serializeTree(root, options));
}
