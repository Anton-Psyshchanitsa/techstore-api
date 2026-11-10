import { Router } from 'express';
import { uploadImageBuffer } from '../../lib/cloudinary.js';
import { badRequest } from '../../lib/errors.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { uploadImagesMiddleware } from '../../middleware/upload.js';

export const uploadsRouter: Router = Router();

uploadsRouter.post(
  '/images',
  authenticate,
  requireRole('admin'),
  uploadImagesMiddleware,
  async (req, res) => {
    const files = Array.isArray(req.files) ? req.files : [];

    if (files.length === 0) {
      throw badRequest('At least one image file is required in field "images"');
    }

    const uploaded = await Promise.all(
      files.map((file) => uploadImageBuffer(file.buffer)),
    );

    res.status(201).json({
      urls: uploaded.map((item) => item.url),
      items: uploaded,
    });
  },
);
