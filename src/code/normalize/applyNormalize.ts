import { computeGroupPlan } from './computePlan';
import { collectMatchingInstances } from './collectMatchingInstances';
import { TOLERANCE } from './constants';
import { loadGroupMap } from './loadGroupMap';

// One pass aligns the group; a second pass detects convergence via the
// dx/dy/needsResize early-exit. Higher counts only burn extra bounding-box reads.
const MAX_ITERATIONS = 2;

export async function applyNormalize(groupName: string): Promise<void> {
  const groupMap = await loadGroupMap(groupName);

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const plan = computeGroupPlan(groupMap);

    if (plan.targetWidth === 0 && plan.targetHeight === 0) {
      return;
    }

    const { dx, dy } = plan.willTranslate;

    const sizeMismatch = (v: ComponentNode) =>
      Math.abs(v.width - plan.targetWidth) > TOLERANCE ||
      Math.abs(v.height - plan.targetHeight) > TOLERANCE;

    let needsResize = false;

    for (const v of plan.variants) {
      if (v.skipReason) {
        continue;
      }

      if (sizeMismatch(v.variant)) {
        needsResize = true;
      }
    }

    if (dx === 0 && dy === 0 && !needsResize) {
      return;
    }

    const { modifiable: instances } = await collectMatchingInstances(plan.eligibleVariantIds);

    for (const v of plan.variants) {
      if (v.skipReason) {
        continue;
      }

      if (dx !== 0 || dy !== 0) {
        for (const child of v.variant.children) {
          try {
            child.x += dx;
            child.y += dy;
          } catch {
            // Child is locked or its parent enforces a layout we can't
            // override. Leave the position as-is; the variant's content will
            // shift relative to siblings, which the user can fix manually.
          }
        }

        try {
          v.variant.x -= dx;
          v.variant.y -= dy;
        } catch {
          // Component is locked or otherwise non-modifiable.
        }
      }

      if (sizeMismatch(v.variant)) {
        v.variant.resizeWithoutConstraints(plan.targetWidth, plan.targetHeight);
      }
    }

    if (dx !== 0 || dy !== 0) {
      for (const instance of instances) {
        try {
          instance.x -= dx;
          instance.y -= dy;
        } catch {
          // Defensive: Figma may still reject the assignment in edge cases
          // (locked layouts, plugin-typings drift).
        }
      }
    }
  }
}
