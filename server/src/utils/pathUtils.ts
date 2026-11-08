import path from 'path';
import fs from 'fs';

/**
 * Returns the canonical absolute path to the uploads directory.
 * Works uniformly in both development (ts-node / src) and production (node dist/src/server.js).
 */
export const getUploadsDir = (): string => {
  // If UPLOADS_DIR env is set, prioritize it
  if (process.env.UPLOADS_DIR) {
    const customDir = path.resolve(process.env.UPLOADS_DIR);
    if (!fs.existsSync(customDir)) fs.mkdirSync(customDir, { recursive: true });
    return customDir;
  }

  // When running in production (from dist):
  // __dirname is .../server/dist/src/utils -> ../../uploads is .../server/dist/uploads
  const distUploads = path.resolve(__dirname, '../../uploads');
  if (__dirname.includes('dist')) {
    if (!fs.existsSync(distUploads)) {
      fs.mkdirSync(distUploads, { recursive: true });
    }
    return distUploads;
  }

  // In development (src):
  const devUploads = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(devUploads)) {
    fs.mkdirSync(devUploads, { recursive: true });
  }
  return devUploads;
};

/**
 * Resolves a stored relative/absolute upload path or URL to an absolute disk path.
 * Searches both the canonical uploads dir and any legacy dist/uploads dirs.
 */
export const resolveDiskPath = (fileUrl: string): string | null => {
  if (!fileUrl) return null;
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return null;

  const baseUploadsDir = getUploadsDir();
  const searchRoots = [
    baseUploadsDir,
    path.resolve(process.cwd(), 'uploads'),
    path.resolve(__dirname, '../../../uploads'),
    path.resolve(__dirname, '../../uploads'),
  ];

  const relative = fileUrl.replace(/^\/?uploads\//, '').replace(/^\//, '');

  for (const root of searchRoots) {
    if (!fs.existsSync(root)) continue;

    // 1. Direct path under root
    const full = path.join(root, relative);
    if (fs.existsSync(full)) return full;

    // 2. Base filename under root
    const baseFile = path.join(root, path.basename(fileUrl));
    if (fs.existsSync(baseFile)) return baseFile;

    // 3. Common subdirectories
    for (const sub of ['thumbnails', 'avatars', 'resources', 'submissions', 'partners', 'materials']) {
      const candidate = path.join(root, sub, path.basename(fileUrl));
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  // Direct check if it's already an existing absolute path
  if (path.isAbsolute(fileUrl) && fs.existsSync(fileUrl)) {
    return fileUrl;
  }

  // Return standard canonical destination
  return path.join(baseUploadsDir, relative);
};
