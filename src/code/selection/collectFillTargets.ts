import type { FillTarget } from '@shared/messages';

/** Node types that take an image fill and keep their shape doing so. */
export const FILLABLE_TYPES = [
  'RECTANGLE',
  'ELLIPSE',
  'POLYGON',
  'STAR',
  'VECTOR',
  'BOOLEAN_OPERATION',
  'FRAME',
  'COMPONENT',
  'INSTANCE',
] as const;

const FILLABLE = new Set<string>(FILLABLE_TYPES);

/** Containers whose children are the targets, not the container itself. */
const FLATTENED_TYPES = new Set(['GROUP', 'SECTION']);

/** How many targets a selection may contribute; more would stall the bridge. */
export const MAX_FILL_TARGETS = 200;

/**
 * The minimum a node has to look like for this module, so the collection is
 * testable without a plugin sandbox.
 */
export type FillCandidate = {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  locked: boolean;
  /** The fillable descendants, for a group or section. */
  findAllWithCriteria?(criteria: { types: string[] }): FillCandidate[];
};

function toTarget(node: FillCandidate): FillTarget {
  return { id: node.id, name: node.name, width: node.width, height: node.height, locked: node.locked };
}

/**
 * The fillable nodes of a selection. A group or section contributes the
 * fillable nodes inside it, every other node only itself. Locked nodes are
 * listed, the apply step skips them and says so.
 */
export function collectFillTargets(selection: readonly FillCandidate[]): FillTarget[] {
  const targets: FillTarget[] = [];
  const seen = new Set<string>();

  const add = (node: FillCandidate) => {
    if (targets.length >= MAX_FILL_TARGETS || seen.has(node.id)) {
      return;
    }

    seen.add(node.id);
    targets.push(toTarget(node));
  };

  for (const node of selection) {
    if (FILLABLE.has(node.type)) {
      add(node);
    } else if (FLATTENED_TYPES.has(node.type) && node.findAllWithCriteria) {
      // Figma answers a type query from its index, faster than a predicate walk.
      for (const child of node.findAllWithCriteria({ types: [...FILLABLE_TYPES] })) {
        add(child);
      }
    }
  }

  return targets;
}
