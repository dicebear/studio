import type {
  FillTarget,
  GenerateFillItem,
  GenerateInsertItem,
  GenerateLayout,
  GenerateResult,
} from '@shared/messages';
import type { AvatarRecord } from '@shared/avatarRecord';
import { tick } from '@shared/tick';
import { request } from '@/lib/bridge';
import type { Overrides } from './avatarOptions';
import { fillResolution, svgToPng } from './rasterize';
import { renderSvg } from './renderAvatar';
import type { StyleEntry } from './styleRegistry';

/** At most this many items, or this many bytes, travel in one message. */
const CHUNK_ITEMS = 10;
const CHUNK_BYTES = 2 * 1024 * 1024;

/** The window paints between this many renders. */
const PAINT_EVERY = 3;

let nextJobId = 1;

export type JobProgress = { phase: 'rendering' | 'applying'; done: number; total: number };

type Common = {
  entry: StyleEntry;
  overrides: Overrides;
  seeds: string[];
  signal?: AbortSignal;
  onProgress?: (progress: JobProgress) => void;
};

function record(entry: StyleEntry, seed: string, overrides: Overrides, size: number): AvatarRecord {
  return { v: 1, source: entry.source, seed, overrides, size, at: Date.now() };
}

/**
 * Renders in step with the sandbox: a chunk is rendered, sent, and the next
 * one waits for the reply, so neither side holds more than a chunk of PNGs.
 */
async function run<T>(
  params: Common & {
    mode: 'fill' | 'insert';
    total: number;
    layout?: GenerateLayout;
    anchor?: 'selection' | 'viewport';
    items: () => AsyncGenerator<{ item: T; bytes: number }>;
    send: (jobId: number, items: T[]) => Promise<{ done: number }>;
  },
): Promise<GenerateResult> {
  const jobId = nextJobId++;
  const { signal, onProgress, total } = params;

  await request('generate:begin', {
    jobId,
    mode: params.mode,
    total,
    styleTitle: params.entry.title,
    layout: params.layout,
    anchor: params.anchor,
  });

  let cancelled = false;
  let rendered = 0;

  try {
    let batch: T[] = [];
    let batchBytes = 0;

    const flush = async () => {
      if (batch.length === 0) {
        return;
      }

      onProgress?.({ phase: 'applying', done: rendered, total });

      await params.send(jobId, batch);
      batch = [];
      batchBytes = 0;
    };

    for await (const { item, bytes } of params.items()) {
      if (signal?.aborted) {
        cancelled = true;
        break;
      }

      batch.push(item);
      batchBytes += bytes;
      rendered++;
      onProgress?.({ phase: 'rendering', done: rendered, total });

      if (batch.length >= CHUNK_ITEMS || batchBytes >= CHUNK_BYTES) {
        await flush();
      }

      if (rendered % PAINT_EVERY === 0) {
        await tick();
      }
    }

    if (!cancelled) {
      await flush();
    }
  } catch (error) {
    await request('generate:end', { jobId, cancelled: true }).catch(() => undefined);

    throw error;
  }

  return request('generate:end', { jobId, cancelled });
}

export function runFillJob(params: Common & { targets: FillTarget[] }): Promise<GenerateResult> {
  const { entry, overrides, seeds, targets } = params;

  return run<GenerateFillItem>({
    ...params,
    mode: 'fill',
    total: targets.length,
    items: async function* () {
      for (let index = 0; index < targets.length; index++) {
        const target = targets[index];
        const seed = seeds[index % seeds.length];
        const size = fillResolution(target.width, target.height);
        const png = await svgToPng(renderSvg(entry, seed, size, overrides), size);

        yield { item: { nodeId: target.id, png, record: record(entry, seed, overrides, size) }, bytes: png.byteLength };
      }
    },
    send: (jobId, fills) => request('generate:chunk', { jobId, fills }),
  });
}

export function runInsertJob(
  params: Common & { layout: GenerateLayout; anchor: 'selection' | 'viewport' },
): Promise<GenerateResult> {
  const { entry, overrides, seeds, layout } = params;

  return run<GenerateInsertItem>({
    ...params,
    mode: 'insert',
    total: seeds.length,
    items: async function* () {
      for (const seed of seeds) {
        const svg = renderSvg(entry, seed, layout.size, overrides);

        yield {
          item: { seed, name: `${entry.title} · ${seed}`, svg, record: record(entry, seed, overrides, layout.size) },
          bytes: svg.length,
        };
      }
    },
    send: (jobId, inserts) => request('generate:chunk', { jobId, inserts }),
  });
}
