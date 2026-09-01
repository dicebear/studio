import rgbHex from 'rgb-hex';

import { isConstantTrack, tracksToDefinitionAnimation } from '../animation/keyframes';
import { animationNameFromLayer } from '../animation/names';
import { DefinitionAnimation } from '../animation/types';
import { findAllInstanceNodes } from '../queries/findAllInstanceNodes';
import { findAllNodesWithColor } from '../queries/findAllNodesWithColor';
import { CURRENT_COLOR_GROUP } from '../utils/currentColor';
import { decodeNodeNameData } from '../utils/decodeNodeNameData';
import { encodeNodeNameData } from '../utils/encodeNodeNameData';
import { getColorsByNode } from '../utils/getColorsByNode';
import { getNameParts } from '../utils/getNameParts';
import { isMotionAvailable } from '../utils/motionSupport';
import { readNodeExportInfo } from '../utils/readNodeExportInfo';
import { resolveComponentName } from '../utils/resolveComponentName';
import { tick } from '../utils/tick';
import { writeNodeExportInfo } from '../utils/writeNodeExportInfo';

type PendingAnimationInfo = {
  /** The clone node, or null when its subtree could not be walked. */
  node: SceneNode | null;
  /** The clone node's marker name, to re-resolve it if the proxy dies. */
  nodeName: string;
  /** How many earlier clone nodes carry the same name, to keep them apart. */
  nameOccurrence: number;
  animations: DefinitionAnimation[];
  animKey: number;
  /** The value the opacity track starts at, when it is not 1. */
  restingOpacity?: number;
};

/**
 * A node's name with the export payload taken back out. The passes before the
 * animation info stamp their own findings into the clone names, so a name
 * collected earlier only matches again once that payload is stripped.
 */
function layerName(node: SceneNode): string {
  const nodeNameData = decodeNodeNameData(node.name);

  nodeNameData.delete('_export');

  return encodeNodeNameData(nodeNameData);
}

/**
 * Reads a node's children and retries once through a freshly resolved proxy.
 * Figma has answered the first read on a just cloned subtree with an internal
 * error ("Unknown id "" in createNode"), and a new handle for the same id
 * reads it fine. Returns undefined when both attempts fail.
 */
async function readChildren(node: SceneNode): Promise<readonly SceneNode[] | undefined> {
  try {
    return (node as SceneNode & ChildrenMixin).children;
  } catch {
    let id: string | undefined;

    try {
      id = node.id;
    } catch {
      return undefined;
    }

    let fresh: BaseNode | null = null;

    try {
      fresh = await figma.getNodeByIdAsync(id);
    } catch {
      return undefined;
    }

    if (fresh === null || !('children' in fresh)) {
      return undefined;
    }

    try {
      return fresh.children as readonly SceneNode[];
    } catch {
      return undefined;
    }
  }
}

/**
 * Reads the manual keyframe tracks of the original subtree and returns the
 * matching clone nodes with their animation export info. The caller writes
 * the info into the clone names right before `exportAsync` — writing it
 * here proved fragile: on the avatar frame, one of the steps between this
 * pass and the export (instance swap, boolean flattening, color walk) reset
 * a wrapper group's name to its original value, silently dropping canvas
 * animations while component exports kept theirs.
 *
 * The original and the clone are walked in parallel by child index. At this
 * point the clone is structurally identical (instances are swapped and
 * booleans flattened only afterwards). Tracks are read from the original —
 * whether `clone()` copies motion data is not part of Figma's documented
 * contract. Instance children belong to the main component and are exported
 * with its group, so the walk reads an instance's own tracks and stops.
 *
 * When the clone side of a subtree cannot be read at all, the walk carries on
 * without it: the animations are still collected from the original and their
 * clone nodes are resolved by marker name when the info is written.
 */
/**
 * Whether the node or any layer below it carries a keyframe track with at
 * least one keyframe. Instance children belong to their main component, so
 * the walk reads an instance's own tracks and stops, like the export does.
 */
function hasAnimations(node: SceneNode): boolean {
  if (!isMotionAvailable(node)) {
    return false;
  }

  const animated = (candidate: SceneNode): boolean => {
    try {
      const tracks = candidate.manualKeyframeTracks as Record<string, { keyframes?: unknown[] }> | undefined;

      return Object.values(tracks ?? {}).some((track) => (track?.keyframes?.length ?? 0) > 0);
    } catch {
      return false;
    }
  };

  if (animated(node)) {
    return true;
  }

  if (node.type === 'INSTANCE' || !('findOne' in node)) {
    return false;
  }

  return node.findOne((child) => animated(child)) !== null;
}

async function collectAnimationExportInfo(
  original: SceneNode,
  clone: SceneNode,
  warn: (message: string) => void,
): Promise<PendingAnimationInfo[]> {
  const pending: PendingAnimationInfo[] = [];

  if (!isMotionAvailable(original)) {
    return pending;
  }

  let animKey = 0;
  const nameCounts = new Map<string, number>();

  const collectNode = async (originalNode: SceneNode, cloneNode: SceneNode | null): Promise<void> => {
    // Counted for every node the walk sees, not just the animated ones: the
    // fallback below looks the name up among all layers that carry it, so the
    // occurrence has to be counted the same way.
    const nodeName = layerName(cloneNode ?? originalNode);
    const nameOccurrence = nameCounts.get(nodeName) ?? 0;

    nameCounts.set(nodeName, nameOccurrence + 1);

    let rawTracks: Record<string, { keyframes?: unknown[] }> | undefined;

    try {
      rawTracks = originalNode.manualKeyframeTracks as Record<string, { keyframes?: unknown[] }>;
    } catch {
      return;
    }

    if (rawTracks && Object.keys(rawTracks).length > 0) {
      const tracks: Record<string, { keyframes: any[] }> = {};

      for (const [field, track] of Object.entries(rawTracks)) {
        // `fills`, `strokes`, and `effects` hold index-keyed sub-tracks
        // rather than keyframe lists. They have no DiceBear equivalent.
        if (!track || !Array.isArray(track.keyframes)) {
          warn(`The animated Figma property "${field}" has no DiceBear equivalent and was not exported.`);

          continue;
        }

        const keyframes = track.keyframes as any[];

        // The import stretches an instance's playback clip with a constant
        // span track. It carries no motion and is not part of the design.
        if (isConstantTrack(keyframes)) {
          continue;
        }

        tracks[field] = { keyframes };
      }

      // The definition keeps the resting opacity as an attribute, Figma only
      // in the track, so it is read back from the first keyframe. A layer
      // resting at zero cannot live in Figma at all (the SVG export drops it),
      // which is why the import hands the track the whole job.
      const opacityKeyframes = tracks.OPACITY?.keyframes;
      const firstOpacity = opacityKeyframes?.[0]?.value;
      const restingOpacity =
        firstOpacity?.type === 'FLOAT' && firstOpacity.value !== 1 ? (firstOpacity.value as number) : undefined;

      let animation = tracksToDefinitionAnimation(tracks, 0, warn);

      // The layer name carries the animation's name. The import writes it,
      // designers may edit it, and the export normalizes whatever they left
      // behind.
      const name = animationNameFromLayer(originalNode.name);

      if (animation && name !== undefined) {
        const { tracks, ...rest } = animation;

        animation = { name, ...rest, tracks };
      }

      if (animation) {
        pending.push({
          node: cloneNode,
          nodeName,
          nameOccurrence,
          animations: [animation],
          animKey: animKey++,
          restingOpacity,
        });
      }
    }

    if (originalNode.type === 'INSTANCE') {
      return;
    }

    if ('children' in originalNode && (cloneNode === null || 'children' in cloneNode)) {
      const originalChildren = await readChildren(originalNode);

      if (originalChildren === undefined) {
        warn(`The children of "${originalNode.name}" could not be read. Animations below it were not exported.`);

        return;
      }

      let cloneChildren: readonly SceneNode[] | undefined;

      if (cloneNode !== null) {
        cloneChildren = await readChildren(cloneNode);

        if (cloneChildren === undefined) {
          warn(
            `The export copy of "${originalNode.name}" could not be read. The animations below it are placed by layer name.`,
          );
        }
      }

      for (let i = 0; i < originalChildren.length; i++) {
        const cloneChild = cloneChildren === undefined ? null : cloneChildren[i];

        if (cloneChildren !== undefined && cloneChild === undefined) {
          break;
        }

        await collectNode(originalChildren[i], cloneChild ?? null);
      }
    }
  };

  await collectNode(original, clone);

  return pending;
}

/**
 * The color a component reference passes down to the `currentColor` layers of
 * its component.
 *
 * The import paints those layers inside the instance with the reference's
 * color while the main component keeps the marker style, so the difference
 * between the two is exactly what the reference contributed. A layer bound to
 * a palette style gives a color group, a plain paint gives a value, and
 * anything ambiguous is left alone.
 */
type PaintChannel = {
  styleId: 'fillStyleId' | 'strokeStyleId';
  paints: 'fills' | 'strokes';
};

const PAINT_CHANNELS: PaintChannel[] = [
  { styleId: 'fillStyleId', paints: 'fills' },
  { styleId: 'strokeStyleId', paints: 'strokes' },
];

/** The id of the color style bound to one of a node's paint channels. */
function boundStyleId(node: SceneNode, channel: PaintChannel): string | undefined {
  const value =
    channel.styleId === 'fillStyleId'
      ? 'fillStyleId' in node
        ? node.fillStyleId
        : undefined
      : 'strokeStyleId' in node
        ? node.strokeStyleId
        : undefined;

  return typeof value === 'string' && value ? value : undefined;
}

/** The single solid paint of one of a node's channels, as a hex string. */
function soloPaintHex(node: SceneNode, channel: PaintChannel): string | undefined {
  const value =
    channel.paints === 'fills'
      ? 'fills' in node
        ? node.fills
        : undefined
      : 'strokes' in node
        ? node.strokes
        : undefined;

  if (!Array.isArray(value) || value.length !== 1) {
    return undefined;
  }

  const paint = value[0] as Paint;

  if (paint.type !== 'SOLID') {
    return undefined;
  }

  return `#${rgbHex(
    Math.round(paint.color.r * 255),
    Math.round(paint.color.g * 255),
    Math.round(paint.color.b * 255),
  )}`;
}

async function readReferenceColor(
  instance: InstanceNode,
  mainComponent: ComponentNode,
  styleGroup: (id: string) => Promise<string | undefined>,
): Promise<{ group?: string; value?: string } | undefined> {
  const groups = new Set<string>();
  const values = new Set<string>();

  const walk = async (node: SceneNode, master: SceneNode): Promise<void> => {
    for (const channel of PAINT_CHANNELS) {
      const masterStyle = boundStyleId(master, channel);

      if (masterStyle === undefined || (await styleGroup(masterStyle)) !== CURRENT_COLOR_GROUP) {
        continue;
      }

      const ownStyle = boundStyleId(node, channel);

      if (ownStyle !== undefined) {
        const group = await styleGroup(ownStyle);

        if (group !== undefined && group !== CURRENT_COLOR_GROUP) {
          groups.add(group);
        }

        continue;
      }

      const hex = soloPaintHex(node, channel);

      if (hex !== undefined) {
        values.add(hex);
      }
    }

    if ('children' in node && 'children' in master) {
      const own = await readChildren(node);
      const theirs = await readChildren(master);

      if (own === undefined || theirs === undefined) {
        return;
      }

      for (let i = 0; i < Math.min(own.length, theirs.length); i++) {
        await walk(own[i], theirs[i]);
      }
    }
  };

  await walk(instance, mainComponent);

  if (groups.size === 1 && values.size === 0) {
    return { group: [...groups][0] };
  }

  if (values.size === 1 && groups.size === 0) {
    return { value: [...values][0] };
  }

  return undefined;
}

/**
 * Whether a main component paints anything with `currentColor`. Only then can a
 * reference to it pass a color down, and only then is the walk over both trees
 * worth its cost. Answered once per component.
 */
function createCurrentColorProbe(
  styleGroup: (id: string) => Promise<string | undefined>,
): (mainComponent: ComponentNode) => Promise<boolean> {
  const answers = new Map<string, boolean>();

  return async (mainComponent: ComponentNode): Promise<boolean> => {
    const cached = answers.get(mainComponent.id);

    if (cached !== undefined) {
      return cached;
    }

    let found = false;

    for (const node of mainComponent.findAll()) {
      for (const channel of PAINT_CHANNELS) {
        const styleId = boundStyleId(node, channel);

        if (styleId !== undefined && (await styleGroup(styleId)) === CURRENT_COLOR_GROUP) {
          found = true;
          break;
        }
      }

      if (found) {
        break;
      }
    }

    answers.set(mainComponent.id, found);

    return found;
  };
}

export async function calculateNodeExportInfo(
  node: ComponentNode | FrameNode,
  aliasesEnabled: boolean,
  animationsEnabled: boolean,
  ignoreColorGroup?: string,
  warn: (message: string) => void = () => {},
) {
  const cloneComponent = figma.createComponent();
  const cloneComponentRectangle = figma.createRectangle();

  cloneComponentRectangle.constraints = {
    horizontal: 'STRETCH',
    vertical: 'STRETCH',
  };

  cloneComponent.name = 'Export Helper Component';
  cloneComponent.insertChild(0, cloneComponentRectangle);

  let nodeClone: ComponentNode | FrameNode;

  try {
    nodeClone = node.clone();
  } catch (e) {
    // The helper would otherwise stay behind in the document.
    cloneComponent.remove();

    throw e;
  }

  // Carried through the steps below so a Figma-internal error names the part
  // of the export it interrupted.
  let phase = 'preparing the clone';

  try {
    // For the export, clip-path must be set in Figma so that the viewport has the correct height and width.
    nodeClone.clipsContent = true;

    // Before the instance swap and the boolean flattening, while the clone
    // still mirrors the original child for child. Only the definition format
    // has a place for animations, and only the 11.x line plays them.
    let pendingAnimationInfo: PendingAnimationInfo[] = [];

    if (aliasesEnabled && animationsEnabled) {
      phase = 'reading the animations';

      // One turn of the event loop before walking the fresh copy. Reading a
      // deep clone in the same tick as `clone()` has come back as a
      // Figma-internal error ("Unknown id "" in createNode").
      await tick();

      pendingAnimationInfo = await collectAnimationExportInfo(node, nodeClone, warn);
    } else if (aliasesEnabled && hasAnimations(node)) {
      warn(
        'DiceBear 10.x renders every avatar static, so the animations were left out of the export. ' +
          'Select DiceBear 11.x in the General tab to include them.',
      );
    }

    phase = 'finding the instances';

    // A handful of styles carry every layer of a file, so resolving each id
    // once keeps the reference-color pass off the plugin bridge.
    const styleGroups = new Map<string, string | undefined>();
    const styleGroup = async (id: string): Promise<string | undefined> => {
      if (!styleGroups.has(id)) {
        const style = (await figma.getStyleByIdAsync(id)) as BaseStyle | null;

        styleGroups.set(id, style === null ? undefined : getNameParts(style.name).group);
      }

      return styleGroups.get(id);
    };

    const usesCurrentColor = createCurrentColorProbe(styleGroup);
    const allInstanceNodes = await findAllInstanceNodes(nodeClone);

    phase = 'swapping the instances';

    for (const { instance: instanceNode, mainComponent } of allInstanceNodes) {
      // Swapping an outer instance removes the instances nested inside it,
      // e.g. a component that embeds another component group.
      if (instanceNode.removed) {
        continue;
      }

      const nodeExportInfo = readNodeExportInfo(instanceNode);

      nodeExportInfo.matrix = {
        a: instanceNode.relativeTransform[0][0],
        b: instanceNode.relativeTransform[1][0],
        c: instanceNode.relativeTransform[0][1],
        d: instanceNode.relativeTransform[1][1],
        tx: instanceNode.relativeTransform[0][2],
        ty: instanceNode.relativeTransform[1][2],
      };

      nodeExportInfo.scale = {
        x: instanceNode.width / mainComponent.width,
        y: instanceNode.height / mainComponent.height,
      };

      nodeExportInfo.componentGroup = resolveComponentName(instanceNode, mainComponent, aliasesEnabled).componentName;

      const referenceColor = (await usesCurrentColor(mainComponent))
        ? await readReferenceColor(instanceNode, mainComponent, styleGroup)
        : undefined;

      if (referenceColor?.group !== undefined) {
        nodeExportInfo.refColorGroup = referenceColor.group;
      } else if (referenceColor?.value !== undefined) {
        nodeExportInfo.refColorValue = referenceColor.value;
      }

      const width = instanceNode.width;
      const height = instanceNode.height;

      instanceNode.swapComponent(cloneComponent);
      instanceNode.resize(width, height);

      writeNodeExportInfo(instanceNode, nodeExportInfo);
    }

    // Figma flat boolean nodes when exporting. In doing so, ids and their information will be lost.
    // That's why we do it ourselves here, so Figma can't delete any information.
    phase = 'flattening boolean shapes';

    const booleanNodes = nodeClone.findAllWithCriteria({ types: ['BOOLEAN_OPERATION'] }).filter((n) => n.visible);

    for (const boNode of booleanNodes) {
      try {
        const wasMask = 'isMask' in boNode && boNode.isMask;
        const newNode = figma.flatten([boNode], boNode.parent!, boNode.parent!.children.indexOf(boNode as SceneNode));

        newNode.isMask = wasMask;
      } catch {
        // This is fine
      }
    }

    phase = 'collecting the colors';

    const allNodesWithColor = await findAllNodesWithColor(nodeClone);

    for (const colorNode of allNodesWithColor) {
      // A parent bound to the ignored group may already have taken this node
      // with it.
      if (colorNode.removed) {
        continue;
      }

      const nodeExportInfo = readNodeExportInfo(colorNode);
      const nodeColors = await getColorsByNode(colorNode);

      const fillStyle = nodeColors.get('fill');
      const strokeStyle = nodeColors.get('stroke');

      if (ignoreColorGroup) {
        // Layers bound to the background group stay out of the export at any
        // depth, the renderer paints that background itself.
        if (
          (fillStyle && getNameParts(fillStyle.name).group === ignoreColorGroup) ||
          (strokeStyle && getNameParts(strokeStyle.name).group === ignoreColorGroup)
        ) {
          colorNode.remove();

          continue;
        }
      }

      if (fillStyle) {
        const group = getNameParts(fillStyle.name).group;

        // A layer bound to the marker style was `currentColor` before the
        // import gave it a paint, and it goes back as `currentColor`. Its
        // alpha belongs to the layer, not to a palette value, so it stays.
        if (group === CURRENT_COLOR_GROUP) {
          nodeExportInfo.fillCurrentColor = true;
        } else {
          nodeExportInfo.fillColorGroup = group;
          nodeExportInfo.fillColorAlpha = getPaintAlpha(fillStyle);
        }
      }

      if (strokeStyle) {
        const group = getNameParts(strokeStyle.name).group;

        if (group === CURRENT_COLOR_GROUP) {
          nodeExportInfo.strokeCurrentColor = true;
        } else {
          nodeExportInfo.strokeColorGroup = group;
          nodeExportInfo.strokeColorAlpha = getPaintAlpha(strokeStyle);
        }
      }

      writeNodeExportInfo(colorNode, nodeExportInfo);
    }

    phase = 'writing the animation info';

    // Last, when nothing can rename the clone nodes anymore. Swapping the
    // instance inside a single-child group makes Figma rebuild the group:
    // the collected proxy dies while a fresh group with the same name takes
    // its place, so a dead reference is re-resolved by its marker name. The
    // same route carries the entries whose clone node was never known.
    // Several layers may share a marker name, and both the walk and
    // `findAll` run in document order, so the n-th entry of a name belongs to
    // the n-th layer carrying it.
    const nodesByName = new Map<string, SceneNode[]>();

    for (const entry of pendingAnimationInfo) {
      let target: SceneNode | null = entry.node;
      let alive = false;

      try {
        alive = target !== null && !target.removed;
      } catch {
        alive = false;
      }

      if (!alive) {
        let candidates = nodesByName.get(entry.nodeName);

        if (candidates === undefined) {
          // The exported node itself first, the way the collecting walk saw it.
          candidates = [nodeClone as SceneNode, ...nodeClone.findAll(() => true)].filter(
            (candidate) => layerName(candidate) === entry.nodeName,
          );
          nodesByName.set(entry.nodeName, candidates);
        }

        target = candidates[entry.nameOccurrence] ?? candidates[0] ?? null;
      }

      if (!target) {
        warn(`The animation on "${entry.nodeName}" was lost during the export.`);

        continue;
      }

      const nodeExportInfo = readNodeExportInfo(target);

      nodeExportInfo.animations = entry.animations;
      nodeExportInfo.animKey = entry.animKey;
      nodeExportInfo.restingOpacity = entry.restingOpacity;

      writeNodeExportInfo(target, nodeExportInfo);
    }

    phase = 'rendering the SVG';

    const codes = await nodeClone.exportAsync({
      format: 'SVG',
      contentsOnly: true,
      svgIdAttribute: true,
    });

    nodeClone.remove();
    cloneComponent.remove();

    let svg = '';

    for (var i = 0; i < codes.byteLength; i++) {
      svg += String.fromCharCode(codes[i]);
    }

    return svg;
  } catch (e) {
    nodeClone.remove();
    cloneComponent.remove();

    if (e && typeof e === 'object' && 'message' in e) {
      // `node.name`, not the clone: the clone is already gone at this point.
      throw new Error(`Error while exporting ${node.name} (${phase}): ${(e as any).message}`);
    } else {
      throw e;
    }
  }
}

/**
 * Alpha of a color style's paint, or undefined when the paint is opaque. The
 * export info travels inside the node id, so the common case stays out of it.
 */
function getPaintAlpha(style: PaintStyle): number | undefined {
  const opacity = (style.paints[0] as SolidPaint).opacity ?? 1;

  return opacity === 1 ? undefined : opacity;
}
