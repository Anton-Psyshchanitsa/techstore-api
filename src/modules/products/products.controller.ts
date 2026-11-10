import type { RequestHandler } from 'express';
import {
  createProductSchema,
  listProductsQuerySchema,
  parseProductId,
  updateProductSchema,
} from './products.schemas.js';
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  updateProduct,
} from './products.service.js';

export const listProductsHandler: RequestHandler = async (req, res) => {
  const query = listProductsQuerySchema.parse(req.query);
  const { data, cacheStatus } = await listProducts(query);
  res.setHeader('X-Cache', cacheStatus);
  res.status(200).json(data);
};

export const getProductByIdHandler: RequestHandler = async (req, res) => {
  const id = parseProductId(req.params);
  const product = await getProductById(id);
  res.status(200).json(product);
};

export const createProductHandler: RequestHandler = async (req, res) => {
  const input = createProductSchema.parse(req.body);
  const product = await createProduct(input);
  res.status(201).json(product);
};

export const updateProductHandler: RequestHandler = async (req, res) => {
  const id = parseProductId(req.params);
  const input = updateProductSchema.parse(req.body);
  const product = await updateProduct(id, input);
  res.status(200).json(product);
};

export const deleteProductHandler: RequestHandler = async (req, res) => {
  const id = parseProductId(req.params);
  await deleteProduct(id);
  res.status(200).json({ message: 'Product deleted successfully' });
};
