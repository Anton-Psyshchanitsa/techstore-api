import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  createProductHandler,
  deleteProductHandler,
  getProductByIdHandler,
  listProductsHandler,
  updateProductHandler,
  uploadProductImageHandler,
} from './products.controller.js';

export const productsRouter: Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

productsRouter.get('/', listProductsHandler);
productsRouter.get('/:id', getProductByIdHandler);
productsRouter.post(
  '/upload-image',
  authenticate,
  requireRole('admin'),
  upload.single('image'),
  uploadProductImageHandler,
);
productsRouter.post('/', authenticate, requireRole('admin'), createProductHandler);
productsRouter.patch('/:id', authenticate, requireRole('admin'), updateProductHandler);
productsRouter.delete('/:id', authenticate, requireRole('admin'), deleteProductHandler);
