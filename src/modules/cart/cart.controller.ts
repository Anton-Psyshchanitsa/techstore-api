import type { RequestHandler } from 'express';
import { unauthorized } from '../../lib/errors.js';
import {
  addCartItemSchema,
  applyPromoSchema,
  parseCartItemId,
  updateCartItemSchema,
} from './cart.schemas.js';
import {
  addCartItem,
  applyPromoCode,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from './cart.service.js';

const requireUserId = (userId: number | undefined): number => {
  if (!userId) {
    throw unauthorized();
  }
  return userId;
};

export const getCartHandler: RequestHandler = async (req, res) => {
  const userId = requireUserId(req.user?.id);
  const cart = await getCart(userId);
  res.status(200).json(cart);
};

export const addCartItemHandler: RequestHandler = async (req, res) => {
  const userId = requireUserId(req.user?.id);
  const input = addCartItemSchema.parse(req.body);
  const cart = await addCartItem(userId, input);
  res.status(201).json(cart);
};

export const updateCartItemHandler: RequestHandler = async (req, res) => {
  const userId = requireUserId(req.user?.id);
  const itemId = parseCartItemId(req.params);
  const input = updateCartItemSchema.parse(req.body);
  const cart = await updateCartItem(userId, itemId, input);
  res.status(200).json(cart);
};

export const removeCartItemHandler: RequestHandler = async (req, res) => {
  const userId = requireUserId(req.user?.id);
  const itemId = parseCartItemId(req.params);
  const cart = await removeCartItem(userId, itemId);
  res.status(200).json(cart);
};

export const clearCartHandler: RequestHandler = async (req, res) => {
  const userId = requireUserId(req.user?.id);
  const cart = await clearCart(userId);
  res.status(200).json(cart);
};

export const applyPromoHandler: RequestHandler = async (req, res) => {
  const userId = requireUserId(req.user?.id);
  const input = applyPromoSchema.parse(req.body);
  const cart = await applyPromoCode(userId, input);
  res.status(200).json(cart);
};
