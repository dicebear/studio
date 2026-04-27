export type NormalizeVariant = {
  name: string;
  currentWidth: number;
  currentHeight: number;
  contentWidth: number;
  contentHeight: number;
  skipReason?: 'auto-layout' | 'no-children';
};

export type NormalizeData = {
  groupName: string;
  targetWidth: number;
  targetHeight: number;
  willTranslate: { dx: number; dy: number };
  variants: NormalizeVariant[];
  instanceCount: number;
  lockedInstanceCount: number;
};
