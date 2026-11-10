import multer from 'multer';
import { badRequest } from '../lib/errors.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const uploadImagesMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 10,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(
        badRequest('Unsupported image format. Allowed: JPEG, PNG, WEBP, AVIF'),
      );
      return;
    }
    callback(null, true);
  },
}).array('images', 10);
