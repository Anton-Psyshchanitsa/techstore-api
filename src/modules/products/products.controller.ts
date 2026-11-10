import type { RequestHandler } from 'express';
import { listProductsQuerySchema, parseProductId } from './products.schemas.js';
import { getProductById, listProducts } from './products.service.js';

export const listProductsHandler: RequestHandler = async (req, res) => {
  const query = listProductsQuerySchema.parse(req.query);
  const result = await listProducts(query);
  res.status(200).json(result);
};

export const getProductByIdHandler: RequestHandler = async (req, res) => {
  const id = parseProductId(req.params);
  const product = await getProductById(id);
  res.status(200).json(product);
};
