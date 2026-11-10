import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { AppError } from './errors.js';

export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

const ensureCloudinaryConfigured = (): void => {
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw new AppError(
      503,
      'CLOUDINARY_NOT_CONFIGURED',
      'Cloudinary credentials are not configured in environment variables',
    );
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
};

export const uploadImageBuffer = async (buffer: Buffer): Promise<UploadedImage> => {
  ensureCloudinaryConfigured();

  return new Promise<UploadedImage>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'techstore/products',
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(
            new AppError(
              502,
              'CLOUDINARY_UPLOAD_FAILED',
              error?.message ?? 'Failed to upload image to Cloudinary',
            ),
          );
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        });
      },
    );

    stream.end(buffer);
  });
};
