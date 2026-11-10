import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  createProductHandler,
  deleteProductHandler,
  getProductByIdHandler,
  listProductsHandler,
  updateProductHandler,
} from './products.controller.js';

export const productsRouter: Router = Router();

productsRouter.get('/', listProductsHandler);
productsRouter.get('/:id', getProductByIdHandler);
productsRouter.post('/', authenticate, requireRole('admin'), createProductHandler);
productsRouter.patch('/:id', authenticate, requireRole('admin'), updateProductHandler);
productsRouter.delete('/:id', authenticate, requireRole('admin'), deleteProductHandler);
