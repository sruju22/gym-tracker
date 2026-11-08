import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type UploadFolder = 'avatars' | 'exercises' | 'progress_photos';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Checks whether Cloudinary credentials are fully configured in the environment
 */
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Streams a memory buffer directly into Cloudinary using the Node.js SDK
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folderType: UploadFolder = 'avatars',
  customIdentifier?: string
): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary credentials are not configured on the server. Please check .env');
  }

  // Define upload parameters per folder use-case
  let folder = 'gymtrackie/general';
  let transformation: any = [{ quality: 'auto', fetch_format: 'auto' }];

  if (folderType === 'avatars') {
    folder = 'gymtrackie/avatars';
    transformation = [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ];
  } else if (folderType === 'exercises') {
    folder = 'gymtrackie/exercises';
    transformation = [
      { width: 1000, height: 1000, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' },
    ];
  } else if (folderType === 'progress_photos') {
    folder = 'gymtrackie/progress_photos';
    transformation = [
      { width: 1400, height: 1800, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' },
    ];
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: customIdentifier ? `${folderType}_${customIdentifier}_${Date.now()}` : undefined,
        resource_type: 'image',
        transformation,
      },
      (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
        if (error || !result) {
          return reject(error || new Error('Upload stream failed without a result'));
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

/**
 * Deletes a file from Cloudinary given its public_id
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  if (!isCloudinaryConfigured() || !publicId) return false;

  try {
    const res = await cloudinary.uploader.destroy(publicId);
    return res.result === 'ok';
  } catch (err) {
    console.warn(`[Cloudinary] Failed to delete asset ${publicId}:`, err);
    return false;
  }
}

export default {
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
};
