/**
 * The contract between the plugin window and the sandbox. Both bundles
 * compile against this file, so a message can only be sent in the shape the
 * other side reads.
 *
 * Requests carry a `requestId` and are answered with exactly one `reply`.
 * Events go one way and are never answered.
 */

import type { AvatarRecord } from './avatarRecord';
import type { ColorGroupSettings, ComponentGroupSettings, ExportData, FrameSettings, NormalizeData } from './types';

export type Mode = 'generate' | 'style';

export type Prefs = {
  mode: Mode;
  window: { width: number; height: number };
  /** The style the Generate tab showed last, as a style key. */
  lastStyleKey: string | null;
};

/** A selected node that can take an image fill. */
export type FillTarget = {
  id: string;
  name: string;
  width: number;
  height: number;
  locked: boolean;
};

export type SelectionInfo = {
  /** Fillable nodes, groups flattened to their children. */
  targets: FillTarget[];
  /** How many nodes the user selected, groups counted as one. */
  selectedCount: number;
  /** Union of the selection's absolute bounds, for placing inserted avatars. */
  bounds: { x: number; y: number; width: number; height: number } | null;
};

export type GenerateLayout = { size: number; columns: number; gap: number };

export const DEFAULT_LAYOUT: GenerateLayout = { size: 128, columns: 6, gap: 16 };

export type GenerateFillItem = { nodeId: string; png: Uint8Array; record: AvatarRecord };
export type GenerateInsertItem = { seed: string; name: string; svg: string; record: AvatarRecord };

export type GenerateSkip = { name: string; message: string };

export type GenerateResult = {
  applied: string[];
  skipped: GenerateSkip[];
};

/**
 * Request name to its params and result. `request()` in the window and
 * `onRequest()` in the sandbox are typed from this map.
 */
export type RequestMap = {
  'export:run': {
    params: Record<string, never>;
    result: { name: string; content: string; warnings: string[] };
  };
  'import:run': {
    params: { name: string; definition: unknown; picksBySeed: Record<string, Record<string, unknown>> };
    result: { warnings: string[] };
  };
  'import:check': { params: Record<string, never>; result: { blocked: string | null } };
  'normalize:prepare': { params: { group: string }; result: NormalizeData };
  'normalize:apply': { params: { group: string }; result: NormalizeData };
  'reveal:instances': { params: { ids: string[] }; result: Record<string, never> };
  'storage:get': { params: { key: string }; result: { value: unknown } };
  'storage:set': { params: { key: string; value: unknown }; result: Record<string, never> };
  'storage:delete': { params: { key: string }; result: Record<string, never> };
  'storage:keys': { params: Record<string, never>; result: { keys: string[] } };
  'generate:begin': {
    params: {
      jobId: number;
      mode: 'fill' | 'insert';
      total: number;
      styleTitle: string;
      layout?: GenerateLayout;
      anchor?: 'selection' | 'viewport';
    };
    result: Record<string, never>;
  };
  'generate:chunk': {
    params: { jobId: number; fills?: GenerateFillItem[]; inserts?: GenerateInsertItem[] };
    result: { done: number };
  };
  'generate:end': { params: { jobId: number; cancelled: boolean }; result: GenerateResult };
};

export type RequestType = keyof RequestMap;

export type RequestMessage = {
  [K in RequestType]: { type: K; requestId: number; params: RequestMap[K]['params'] };
}[RequestType];

export type UiEvent =
  | { type: 'ui:ready'; mode: Mode }
  | { type: 'ui:mode'; mode: Mode }
  | { type: 'ui:resize'; width: number; height: number }
  | { type: 'prefs:set'; prefs: Partial<Prefs> }
  /** The Generate settings, kept on the document so they come back with the file. */
  | { type: 'file-settings:set'; settings: unknown }
  | { type: 'progress:painted'; step: number }
  | { type: 'style:refresh' }
  | { type: 'settings:frame:set'; settings: FrameSettings }
  | { type: 'settings:component:set'; group: string; settings: ComponentGroupSettings }
  | { type: 'settings:color:set'; group: string; settings: ColorGroupSettings };

export type UiToPluginMessage = RequestMessage | UiEvent;

export type Reply<T = unknown> =
  | { type: 'reply'; requestId: number; ok: true; result: T }
  | { type: 'reply'; requestId: number; ok: false; message: string };

export type PluginEvent =
  | {
      type: 'plugin:init';
      prefs: Prefs;
      selection: SelectionInfo;
      command: string | null;
      /** The record of the first selected avatar when a relaunch button opened the plugin. */
      relaunch: AvatarRecord | null;
      /** What `file-settings:set` stored on this document, null when nothing yet. */
      fileSettings: unknown;
    }
  | { type: 'selection:changed'; selection: SelectionInfo }
  | { type: 'progress'; message: string; progress?: number; step: number }
  | { type: 'style:loading' }
  | { type: 'style:loaded'; data: ExportData }
  | { type: 'style:none' }
  | { type: 'style:error'; message: string };

export type PluginToUiMessage = Reply | PluginEvent;
