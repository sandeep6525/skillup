import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { upload } from '../utils/upload';
import { authenticate, authorize } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { getUploadsDir } from '../utils/pathUtils';

const router = Router();

const imageFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  const allowed = /jpeg|jpg|png|webp|gif|svg|avif/;
  const ext = (file.originalname.split('.').pop() || '').toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (allowed.test(ext) && (mime.startsWith('image/') || allowed.test(mime) || mime === 'image/svg+xml')) {
    return cb(null, true);
  }
  cb(new AppError('Only image files (JPG, JPEG, PNG, WEBP, GIF, SVG, AVIF) under 10MB are allowed', 400));
};

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      // If folder query or param or header is avatar, save to avatars
      const isAvatar =
        req.query.folder === 'avatars' ||
        req.body?.folder === 'avatars' ||
        req.path.includes('avatar') ||
        req.originalUrl?.includes('avatar');
      const sub = isAvatar ? 'avatars' : 'thumbnails';
      const dir = path.join(getUploadsDir(), sub);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const cleanExt = path.extname(file.originalname).toLowerCase() || '.png';
      cb(null, `${uniqueSuffix}${cleanExt}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: imageFilter,
});

router.post('/upload/image', authenticate, authorize('INSTRUCTOR', 'ADMIN'), imageUpload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No image uploaded', 400);
    }

    const baseUploadsDir = getUploadsDir();
    let relativeSubPath = path.relative(baseUploadsDir, req.file.destination).replace(/\\/g, '/');
    if (relativeSubPath && !relativeSubPath.startsWith('/')) {
      relativeSubPath = `/${relativeSubPath}`;
    }

    const relativeUrl = `/uploads${relativeSubPath ? relativeSubPath : '/thumbnails'}/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        fileUrl: relativeUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/upload', authenticate, upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const baseUploadsDir = getUploadsDir();
    // Calculate relative path cleanly from base uploads directory
    let relativeSubPath = path.relative(baseUploadsDir, req.file.destination).replace(/\\/g, '/');
    if (relativeSubPath && !relativeSubPath.startsWith('/')) {
      relativeSubPath = `/${relativeSubPath}`;
    }

    const relativeUrl = `/uploads${relativeSubPath ? relativeSubPath : ''}/${req.file.filename}`;

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileUrl: relativeUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
