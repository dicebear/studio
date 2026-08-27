// Figma's plugin sandbox does not provide structuredClone, which
// @dicebear/core uses to copy plain JSON data. A JSON round trip covers that.
const globalRef = globalThis as { structuredClone?: <T>(value: T) => T };

globalRef.structuredClone ??= (value) => JSON.parse(JSON.stringify(value));
