/** Build a ZIP containing generated text files and a machine-readable report. */
import JSZip from 'jszip';
import type { BuildReport } from './core-types.ts';

export interface PackFile { path: string; content: string }
export async function packZip(files: PackFile[], report: BuildReport): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const file of files) zip.file(file.path, file.content, { createFolders: false });
  zip.file('build-report.json', `${JSON.stringify(report, null, 2)}\n`);
  return new Uint8Array(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
}
