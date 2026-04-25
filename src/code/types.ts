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
  /** When set, this entry is an alias and inherits collection/dimensions from the named group. */
  extendsGroup?: string;
};

export type ExportColorGroup = {
  settings: ColorGroupSettings;
  isUsedByComponents: boolean;
  collection: Record<string, ExportColor>;
};

export type Export = {
  frame: {
    id: string;
    settings: FrameSettings;
  };
  components: Record<string, ExportComponentGroup>;
  colors: Record<string, ExportColorGroup>;
};

export type NodeExportInfo = {
  matrix?: {
    a: number;
    b: number;
    c: number;
    d: number;
    tx: number;
    ty: number;
  };
  scale?: {
    x: number;
    y: number;
  };
  fillColorGroup?: string;
  strokeColorGroup?: string;
  componentGroup?: string;
};

export type DefinitionElement = {
  type: string;
  name?: string;
  value?: string;
  attributes?: Record<string, string|{type: string; name: string}>;
  children?: DefinitionElement[];
};

export type DefinitionComponentBase = {
  width: number;
  height: number;
  probability?: number;
  rotate?: number[];
  scale?: number[];
  translate?: {
    x?: number[];
    y?: number[];
  };
  variants: Record<string, {
    elements: DefinitionElement[];
  }>;
};

export type DefinitionComponentAlias = {
  extends: string;
  probability?: number;
  rotate?: number[];
  scale?: number[];
  translate?: {
    x?: number[];
    y?: number[];
  };
};

export type DefinitionComponents = Record<string, DefinitionComponentBase | DefinitionComponentAlias>;

export type DefinitionColors = Record<string, {
  values: string[];
  notEqualTo?: string[];
  contrastTo?: string;
}>;
