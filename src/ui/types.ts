export type FrameSettings = {
  dicebearVersion: string;
  title: string;
  packageName: string;
  packageVersion: string;
  creator: string;
  homepage: string;
  sourceTitle: string;
  source: string;
  licenseName: string;
  licenseUrl: string;
  licenseText: string;
  backgroundColorGroupName: string;
  shapeRendering: string;
  onPreCreateHook: string;
  onPostCreateHook: string;
  precision: number;
  fileShareUrl: string;
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
  /** When set, this entry is an alias of the named source group. */
  extendsGroup?: string;
  /** When set, the Figma node ids of the renamed instances that triggered this alias. */
  aliasInstanceIds?: string[];
};

export type ExportColorGroup = {
  settings: ColorGroupSettings;
  isUsedByComponents: boolean;
  collection: Record<string, ExportColor>;
};

export type ExportComponentGroups = Record<string, ExportComponentGroup>;
export type ExportColorGroups = Record<string, ExportColorGroup>;

export type ExportData = {
  frame: {
    id: string;
    settings: FrameSettings;
  };
  components: ExportComponentGroups;
  colors: ExportColorGroups;
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

export type PluginMessage =
  | { type: 'loading'; data?: { message?: string; progress?: number } }
  | { type: 'loaded'; data: ExportData }
  | { type: 'normalize'; data: NormalizeData }
  | { type: 'normalize:error'; data: { groupName: string; message: string } }
  | { type: 'error'; data: { message: string } }
  | { type: 'welcome' }
  | { type: 'import:result'; data: { warnings: string[] } }
  | {
      type: 'export';
      data: { name: string; files?: Record<string, string>; content?: string; warnings?: string[] };
    };
