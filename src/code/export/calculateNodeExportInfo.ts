import { findAllInstanceNodes } from '../queries/findAllInstanceNodes';
import { findAllNodesWithColor } from '../queries/findAllNodesWithColor';
import { getColorsByNode } from '../utils/getColorsByNode';
import { getNameParts } from '../utils/getNameParts';
import { readNodeExportInfo } from '../utils/readNodeExportInfo';
import { resolveComponentName } from '../utils/resolveComponentName';
import { writeNodeExportInfo } from '../utils/writeNodeExportInfo';

export async function calculateNodeExportInfo(
  node: ComponentNode | FrameNode,
  aliasesEnabled: boolean,
  ignoreColorGroup?: string,
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

  try {
    // For the export, clip-path must be set in Figma so that the viewport has the correct height and width.
    nodeClone.clipsContent = true;

    const allInstanceNodes = await findAllInstanceNodes(nodeClone);

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
      throw new Error(`Error while exporting ${node.name}: ${(e as any).message}`);
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
