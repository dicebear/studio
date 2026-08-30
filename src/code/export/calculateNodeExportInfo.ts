import { isConstantTrack, tracksToDefinitionAnimation } from '../animation/keyframes';
import { parseAnimMarkerName } from '../animation/markers';
import { findAllInstanceNodes } from '../queries/findAllInstanceNodes';
import { findAllNodesWithColor } from '../queries/findAllNodesWithColor';
import { getColorsByNode } from '../utils/getColorsByNode';
import { getNameParts } from '../utils/getNameParts';
import { isMotionAvailable } from '../utils/motionSupport';
import { readNodeExportInfo } from '../utils/readNodeExportInfo';
import { resolveComponentName } from '../utils/resolveComponentName';
import { writeNodeExportInfo } from '../utils/writeNodeExportInfo';

type PendingAnimationInfo = {
  node: SceneNode;
  /** The clone node's marker name, to re-resolve it if the proxy dies. */
  nodeName: string;
  animations: unknown[];
  animKey: number;
};

/**
 * Reads the manual keyframe tracks of the original subtree and returns the
 * matching clone nodes with their animation export info. The caller writes
 * the info into the clone names right before `exportAsync` — writing it
 * here proved fragile: on the avatar frame, one of the steps between this
 * pass and the export (instance swap, boolean flattening, color walk) reset
 * a wrapper group's name to its original value, silently dropping canvas
 * animations while component exports kept theirs.
 *
 * The original and the clone are walked in parallel by child index; at this
 * point the clone is structurally identical (instances are swapped and
 * booleans flattened only afterwards). Tracks are read from the original —
 * whether `clone()` copies motion data is not part of Figma's documented
 * contract. Instance children belong to the main component and are exported
 * with its group, so the walk reads an instance's own tracks and stops.
 */
function collectAnimationExportInfo(
  original: SceneNode,
  clone: SceneNode,
  warn: (message: string) => void,
): PendingAnimationInfo[] {
  const pending: PendingAnimationInfo[] = [];

  if (!isMotionAvailable(original)) {
    return pending;
  }

  let animKey = 0;

  const collectNode = (originalNode: SceneNode, cloneNode: SceneNode): void => {
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
        // rather than keyframe lists; they have no DiceBear equivalent.
        if (!track || !Array.isArray(track.keyframes)) {
          warn(`The animated Figma property "${field}" has no DiceBear equivalent and was not exported.`);

          continue;
        }

        let keyframes = track.keyframes as any[];

        // The import stretches an instance's playback clip with a constant
        // span track; it carries no motion and is not part of the design.
        if (isConstantTrack(keyframes)) {
          continue;
        }

        // The definition animates opacity as a multiplier on the element's
        // own opacity; Figma's OPACITY track is absolute.
        if (field === 'OPACITY' && 'opacity' in originalNode && originalNode.opacity > 0 && originalNode.opacity !== 1) {
          const base = originalNode.opacity;

          keyframes = keyframes.map((keyframe) => ({
            ...keyframe,
            value:
              keyframe.value?.type === 'FLOAT'
                ? { type: 'FLOAT', value: keyframe.value.value / base }
                : keyframe.value,
          }));
        }

        tracks[field] = { keyframes };
      }

      let animation = tracksToDefinitionAnimation(tracks, 0, warn);

      // The `dbanim:` layer name carries the animation's user-selectable
      // name; the import writes it, designers may edit it. An origin never
      // travels forward anymore (the import decomposes it into native
      // tracks); the marker's retired `@x,y` suffix only fills in for files
      // imported before that change.
      const marker = parseAnimMarkerName(originalNode.name);

      if (animation && marker) {
        const { tracks, ...rest } = animation;

        animation = {
          ...(marker.name !== undefined ? { name: marker.name } : {}),
          ...rest,
          ...(marker.origin !== undefined ? { origin: marker.origin } : {}),
          tracks,
        };
      }

      if (animation) {
        pending.push({
          node: cloneNode,
          nodeName: cloneNode.name,
          animations: [animation],
          animKey: animKey++,
        });
      }
    }

    if (originalNode.type === 'INSTANCE') {
      return;
    }

    if ('children' in originalNode && 'children' in cloneNode) {
      let originalChildren: readonly SceneNode[];
      let cloneChildren: readonly SceneNode[];

      try {
        originalChildren = originalNode.children;
        cloneChildren = cloneNode.children;
      } catch (e: any) {
        warn(
          `The children of "${originalNode.name}" could not be read (${e.message}); animations below it were not exported.`,
        );

        return;
      }

      for (let i = 0; i < Math.min(originalChildren.length, cloneChildren.length); i++) {
        collectNode(originalChildren[i], cloneChildren[i]);
      }
    }
  };

  collectNode(original, clone);

  return pending;
}

export async function calculateNodeExportInfo(
  node: ComponentNode | FrameNode,
  aliasesEnabled: boolean,
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

  const nodeClone = node.clone();

  // Carried through the steps below so a Figma-internal error names the part
  // of the export it interrupted.
  let phase = 'preparing the clone';

  try {
    // For the export, clip-path must be set in Figma so that the viewport has the correct height and width.
    nodeClone.clipsContent = true;

    // Before the instance swap and the boolean flattening, while the clone
    // still mirrors the original child for child. Only the 10.x definition
    // format has a place for animations, and `aliasesEnabled` is set exactly
    // in that mode.
    let pendingAnimationInfo: PendingAnimationInfo[] = [];

    if (aliasesEnabled) {
      phase = 'reading the animations';
      pendingAnimationInfo = collectAnimationExportInfo(node, nodeClone, warn);
    }

    phase = 'finding the instances';

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
        nodeExportInfo.fillColorGroup = getNameParts(fillStyle.name).group;
        nodeExportInfo.fillColorAlpha = getPaintAlpha(fillStyle);
      }

      if (strokeStyle) {
        nodeExportInfo.strokeColorGroup = getNameParts(strokeStyle.name).group;
        nodeExportInfo.strokeColorAlpha = getPaintAlpha(strokeStyle);
      }

      writeNodeExportInfo(colorNode, nodeExportInfo);
    }

    phase = 'writing the animation info';

    // Last, when nothing can rename the clone nodes anymore. Swapping the
    // instance inside a single-child group makes Figma rebuild the group:
    // the collected proxy dies while a fresh group with the same name takes
    // its place, so a dead reference is re-resolved by its marker name.
    for (const entry of pendingAnimationInfo) {
      let target: SceneNode | null = entry.node;

      if (target.removed) {
        target = nodeClone.findOne((candidate) => candidate.name === entry.nodeName);
      }

      if (!target) {
        warn(`The animation on "${entry.nodeName}" was lost during the export.`);

        continue;
      }

      const nodeExportInfo = readNodeExportInfo(target);

      nodeExportInfo.animations = entry.animations as never;
      nodeExportInfo.animKey = entry.animKey;

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
