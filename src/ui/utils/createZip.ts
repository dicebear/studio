import JSZip from 'jszip';

export async function createZip(files: Record<string, string>): Promise<Blob> {
  const zip = new JSZip();

  for (const path in files) {
    if (!Object.prototype.hasOwnProperty.call(files, path)) {
      continue;
    }

    const file = files[path];

    zip.file(path, file.trim() + '\n', { binary: false });
  }

  return zip.generateAsync({ type: 'blob' });
}
