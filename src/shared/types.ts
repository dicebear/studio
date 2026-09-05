/**
 * The settings and export data both bundles exchange. Nothing in here may
 * touch the DOM or the `figma` global: the UI and the sandbox compile this
 * directory under their own `lib` settings.
 */

export type FrameSettings = {
  title: string;
  creator: string;
  homepage: string;
  sourceTitle: string;
  source: string;
  licenseName: string;
  licenseUrl: string;
  licenseText: string;
  backgroundColorGroupName: string;
  shapeRendering: string;
  precision: number;
};

export type DefinitionRange = { min: number; max: number; step?: number };

export type RangeValue = DefinitionRange | null;

export type ComponentGroupSettings = {
  defaults: Record<string, boolean>;
  weights: Record<string, number>;
  tags: Record<string, string[]>;
  probability: number | null;
  rotation: RangeValue;
  scale: RangeValue;
  translateX: RangeValue;
  translateY: RangeValue;
};

export type ColorGroupSettings = {
  notEqualTo: Record<string, boolean>;
  contrastTo: string | null;
};

export type ExportComponent = {
  id: string;
  name: string;
};

export type ExportColor = {
  id: string;
  name: string;
  value: string;
};

export type ExportComponentGroup = {
  settings: ComponentGroupSettings;
  collection: Record<string, ExportComponent>;
  width: number;
  height: number;
  /** When set, this entry is an alias and inherits collection and dimensions from the named group. */
  extendsGroup?: string;
  /** When set, the Figma node ids of the renamed instances that triggered this alias. */
  aliasInstanceIds?: string[];
};

export type ExportColorGroup = {
  settings: ColorGroupSettings;
  isUsedByComponents: boolean;
  collection: Record<string, ExportColor>;
};

export type ExportData = {
  frame: {
    id: string;
    settings: FrameSettings;
  };
  components: Record<string, ExportComponentGroup>;
  colors: Record<string, ExportColorGroup>;
};

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
