import { hexColor, type PaintChannel } from '../figma-svg';
import { CURRENT_COLOR_GROUP } from '../utils/currentColor';
import { getNameParts } from '../utils/getNameParts';

/** Resolves a style id, `figma.getStyleByIdAsync` in a plugin. */
export type StyleLookup = (id: string) => Promise<BaseStyle | null>;

/** Resolves a style id to the group part of the style's name. */
export type StyleGroupResolver = (id: string) => Promise<string | undefined>;

/**
 * Answers each style id once. A handful of styles carry every layer of a
 * file, so caching keeps the reference-color pass off the plugin bridge.
 */
export function createStyleCache(getStyleById: StyleLookup): StyleLookup {
  const styles = new Map<string, BaseStyle | null>();

  return async (id: string): Promise<BaseStyle | null> => {
    if (!styles.has(id)) {
      styles.set(id, await getStyleById(id));
    }

    return styles.get(id) ?? null;
  };
}

export function createStyleGroupResolver(styles: StyleLookup): StyleGroupResolver {
  return async (id: string): Promise<string | undefined> => {
    const style = await styles(id);

    return style === null ? undefined : getNameParts(style.name).group;
  };
}

/**
 * A node's children, or undefined when Figma refuses to hand them over.
 * Materializing the internals of an instance has failed inside Figma, and one
 * unreadable subtree should not end the export.
 */
function childrenOf(node: SceneNode): readonly SceneNode[] | undefined {
  try {
    return (node as SceneNode & ChildrenMixin).children;
  } catch {
    return undefined;
  }
}

const PAINT_CHANNELS: PaintChannel[] = ['fill', 'stroke'];

/** The id of the color style bound to one of a node's paint channels. */
function boundStyleId(node: SceneNode, channel: PaintChannel): string | undefined {
  const value = (node as unknown as Record<string, unknown>)[`${channel}StyleId`];

  return typeof value === 'string' && value !== '' ? value : undefined;
}

/** The single solid paint of one of a node's channels, as a hex string. */
function soloPaintHex(node: SceneNode, channel: PaintChannel): string | undefined {
  const value = (node as unknown as Record<string, unknown>)[`${channel}s`];

  if (!Array.isArray(value) || value.length !== 1) {
    return undefined;
  }

  const paint = value[0] as Paint;

  return paint.type === 'SOLID' ? hexColor(paint.color) : undefined;
}

export type ReferenceColor = { group?: string; value?: string };

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
export async function readReferenceColor(
  instance: InstanceNode,
  mainComponent: ComponentNode,
  styleGroup: StyleGroupResolver,
): Promise<ReferenceColor | undefined> {
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
      const own = childrenOf(node);
      const theirs = childrenOf(master);

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
export function createCurrentColorProbe(
  styleGroup: StyleGroupResolver,
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
