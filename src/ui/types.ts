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

export type RangeValue = number | readonly [number, number] | null;

export type ComponentGroupSettings = {
  defaults: Record<string, boolean>;
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
  | { type: 'loading'; data?: { message?: string } }
  | { type: 'loaded'; data: ExportData }
  | { type: 'normalize'; data: NormalizeData }
  | { type: 'normalize:error'; data: { groupName: string; message: string } }
  | { type: 'error'; data: { message: string } }
  | {
      type: 'export';
      data: { name: string; files?: Record<string, string>; content?: string };
    };
