import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

export type LoadedImage = {
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
  absolutePath: string;
};

const IMAGE_MIME_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".webp": "image/webp",
};

export function isPathInsideRoot(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

export async function loadAllowedImages(
  filePaths: string[],
  allowedRoots: string[],
  maxImageBytes: number,
): Promise<LoadedImage[]> {
  if (allowedRoots.length === 0) {
    throw new Error(
      "Image upload is disabled. Set NAVER_COMMERCE_ALLOWED_FILE_ROOTS to one or more comma-separated directories and restart the server.",
    );
  }
  if (filePaths.length === 0 || filePaths.length > 10) {
    throw new Error("Product image upload requires 1 to 10 files.");
  }

  const realRoots = await Promise.all(allowedRoots.map((root) => realpath(root)));
  const loaded: LoadedImage[] = [];

  for (const input of filePaths) {
    const absolute = await realpath(path.resolve(input));
    if (!realRoots.some((root) => isPathInsideRoot(absolute, root))) {
      throw new Error(`File is outside NAVER_COMMERCE_ALLOWED_FILE_ROOTS: ${input}`);
    }

    const metadata = await stat(absolute);
    if (!metadata.isFile()) throw new Error(`Not a regular file: ${input}`);
    if (metadata.size <= 0) throw new Error(`Image file is empty: ${input}`);
    if (metadata.size > maxImageBytes) {
      throw new Error(`Image exceeds NAVER_COMMERCE_MAX_IMAGE_BYTES: ${input}`);
    }

    const extension = path.extname(absolute).toLowerCase();
    const mimeType = IMAGE_MIME_TYPES[extension];
    if (!mimeType) throw new Error(`Unsupported image extension '${extension}': ${input}`);

    loaded.push({
      filename: path.basename(absolute),
      mimeType,
      bytes: await readFile(absolute),
      absolutePath: absolute,
    });
  }
  return loaded;
}
