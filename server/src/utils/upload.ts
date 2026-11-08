import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '../middlewares/errorHandler';
import { getUploadsDir } from './pathUtils';

const uploadDir = getUploadsDir();

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Subdirectories
['thumbnails', 'avatars', 'resources', 'submissions', 'partners'].forEach((sub) => {
  const p = path.join(uploadDir, sub);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    let sub = 'resources';
    if (req.baseUrl.includes('upload/avatar') || req.path.includes('avatar')) sub = 'avatars';
    else if (req.baseUrl.includes('upload/thumbnail') || req.path.includes('thumbnail')) sub = 'thumbnails';
    else if (req.baseUrl.includes('upload/partner') || req.path.includes('partner') || req.originalUrl?.includes('partner')) sub = 'partners';
    else if (req.path.includes('submission')) sub = 'submissions';
    cb(null, path.join(uploadDir, sub));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|svg|pdf|zip|docx|doc|mp4|webm/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype) || file.mimetype === 'image/svg+xml';

    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new AppError('File format not supported. Allowed: images (JPG, PNG, WEBP, SVG), pdf, docs, zip, mp4.', 400));
  },
});
