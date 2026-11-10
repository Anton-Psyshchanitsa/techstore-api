import { Router } from 'express';
import { getProductByIdHandler, listProductsHandler } from './products.controller.js';

export const productsRouter: Router = Router();

productsRouter.get('/', listProductsHandler);
productsRouter.get('/:id', getProductByIdHandler);
