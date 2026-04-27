import { computeGroupPlan } from './computePlan';
import { collectMatchingInstances } from './collectMatchingInstances';
import { loadGroupMap } from './loadGroupMap';
import type { NormalizeData } from './types';

export async function prepareNormalize(groupName: string): Promise<NormalizeData> {
  const groupMap = await loadGroupMap(groupName);
  const plan = computeGroupPlan(groupMap);
  const { modifiable, lockedCount } = await collectMatchingInstances(plan.eligibleVariantIds);

  return {
    groupName,
    targetWidth: plan.targetWidth,
    targetHeight: plan.targetHeight,
    willTranslate: plan.willTranslate,
    variants: plan.variants.map((v) => ({
      name: v.name,
      currentWidth: v.currentWidth,
      currentHeight: v.currentHeight,
      contentWidth: v.contentBox?.width ?? 0,
      contentHeight: v.contentBox?.height ?? 0,
      skipReason: v.skipReason,
    })),
    instanceCount: modifiable.length,
    lockedInstanceCount: lockedCount,
  };
}
