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
  /** When set, this entry is an alias and inherits collection/dimensions from the named group. */
  extendsGroup?: string;
  /** When set, the Figma node ids of the renamed instances that triggered this alias. */
  aliasInstanceIds?: string[];
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

export type DefinitionElement = {
  type: string;
  name?: string;
  value?: string;
  attributes?: Record<string, string | { type: string; name: string }>;
  animations?: import('./animation/types').DefinitionAnimation[];
  children?: DefinitionElement[];
};

export type DefinitionComponentBase = {
  width: number;
  height: number;
  probability?: number;
  rotate?: DefinitionRange;
  scale?: DefinitionRange;
  translate?: {
    x?: DefinitionRange;
    y?: DefinitionRange;
  };
  variants: Record<
    string,
    {
      elements: DefinitionElement[];
      weight?: number;
      tags?: string[];
    }
  >;
};

export type DefinitionComponentAlias = {
  extends: string;
};

export type DefinitionComponents = Record<string, DefinitionComponentBase | DefinitionComponentAlias>;

export type DefinitionColors = Record<
  string,
  {
    values: string[];
    notEqualTo?: string[];
    contrastTo?: string;
  }
>;

export type DefinitionMeta = {
  license?: { name?: string; url?: string; text?: string };
  creator?: { name?: string; url?: string };
  source?: { name?: string; url?: string };
};

export type DefinitionFile = {
  $schema?: string;
  $comment?: string;
  meta?: DefinitionMeta;
  canvas: {
    elements: DefinitionElement[];
    width: number;
    height: number;
  };
  attributes?: Record<string, string | { type: string; name: string }>;
  components?: DefinitionComponents;
  colors?: DefinitionColors;
};
