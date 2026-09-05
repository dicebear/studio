export type {
  ColorGroupSettings,
  ComponentGroupSettings,
  DefinitionRange,
  ExportColor,
  ExportColorGroup,
  ExportComponent,
  ExportComponentGroup,
  FrameSettings,
  NormalizeData,
  NormalizeVariant,
  RangeValue,
} from '@shared/types';
export type { ExportData as Export } from '@shared/types';

import type { DefinitionRange } from '@shared/types';

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
