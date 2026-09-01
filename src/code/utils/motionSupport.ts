let cached: boolean | null = null;

/**
 * Whether Figma's motion API is available for the current user. The API is
 * feature-gated: without the gate, every motion property throws on access
 * rather than returning undefined. Probed once and cached. A throw is final
 * for the session, so the plugin never retries.
 */
export function isMotionAvailable(probe: SceneNode): boolean {
  if (cached === null) {
    try {
      void probe.manualKeyframeTracks;
      cached = true;
    } catch {
      cached = false;
    }
  }

  return cached;
}
