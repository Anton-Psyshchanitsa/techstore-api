import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  addCartItemHandler,
  applyPromoHandler,
  clearCartHandler,
  getCartHandler,
  removeCartItemHandler,
  updateCartItemHandler,
} from './cart.controller.js';

export const cartRouter: Router = Router();

cartRouter.use(authenticate);

cartRouter.get('/', getCartHandler);
cartRouter.delete('/', clearCartHandler);
cartRouter.post('/items', addCartItemHandler);
cartRouter.patch('/items/:id', updateCartItemHandler);
cartRouter.delete('/items/:id', removeCartItemHandler);
cartRouter.post('/apply-promo', applyPromoHandler);
