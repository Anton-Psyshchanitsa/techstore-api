import type { RequestHandler } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { badRequest } from '../../lib/errors.js';
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

export const uploadProductImageHandler: RequestHandler = async (req, res) => {
  if (!req.file) {
    throw badRequest('No image file provided');
  }
  const fileBuffer = req.file.buffer;

  const uploadPromise = new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'techstore/products' },
      (error, result) => {
        if (error || !result) {
          const errorMessage = error?.message || 'Upload failed';
          reject(new Error(errorMessage));
        } else {
          resolve(result);
        }
      }
    );

    Readable.from(fileBuffer).pipe(stream);
  });

  const result = await uploadPromise;
  res.status(200).json({ url: result.secure_url });
};
