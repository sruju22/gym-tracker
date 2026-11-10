import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';

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
 * Strips surrounding quotes, whitespace, carriage returns, and newlines
 * often inadvertently introduced when pasting into hosting dashboards (like Render).
 */
function cleanValue(val?: string | null): string {
  if (!val) return '';
  return String(val)
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

/**
 * Extracts and sanitizes Cloudinary configuration from either individual variables
 * or standard CLOUDINARY_URL connection string.
 */
export function getSanitizedCloudinaryConfig(): {
  cloud_name: string;
  api_key: string;
  api_secret: string;
} {
  let cloud_name = cleanValue(process.env.CLOUDINARY_CLOUD_NAME);
  let api_key = cleanValue(process.env.CLOUDINARY_API_KEY);
  let api_secret = cleanValue(process.env.CLOUDINARY_API_SECRET);

  // If individual vars are incomplete, attempt extraction from CLOUDINARY_URL
  const cloudinaryUrl = cleanValue(process.env.CLOUDINARY_URL);
  if (cloudinaryUrl && (!cloud_name || !api_key || !api_secret)) {
    try {
      const parsed = new URL(cloudinaryUrl);
      api_key = api_key || decodeURIComponent(parsed.username);
      api_secret = api_secret || decodeURIComponent(parsed.password);
      cloud_name = cloud_name || parsed.hostname;
    } catch {
      // ignore URL parsing error
    }
  }

  return { cloud_name, api_key, api_secret };
}

/**
 * Applies the clean, sanitized configuration to the Cloudinary SDK instance.
 */
export function ensureCloudinaryConfigured(): boolean {
  const { cloud_name, api_key, api_secret } = getSanitizedCloudinaryConfig();
  if (!cloud_name || !api_key || !api_secret) {
    return false;
  }

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });

  return true;
}

// Initial configuration attempt at module load
ensureCloudinaryConfigured();

/**
 * Checks whether Cloudinary credentials are fully configured in the environment
 */
export function isCloudinaryConfigured(): boolean {
  const { cloud_name, api_key, api_secret } = getSanitizedCloudinaryConfig();
  return Boolean(cloud_name && api_key && api_secret);
}

/**
 * Streams a memory buffer directly into Cloudinary using the Node.js SDK
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folderType: UploadFolder = 'avatars',
  customIdentifier?: string
): Promise<CloudinaryUploadResult> {
  if (!ensureCloudinaryConfigured()) {
    throw new Error('Cloudinary credentials are not configured on the server. Please check .env or hosting environment variables.');
  }

  const { cloud_name, api_key } = getSanitizedCloudinaryConfig();

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
          console.error(
            `[Cloudinary] Upload failed for cloud_name "${cloud_name}" (API Key ending in ...${api_key.slice(-4)}):`,
            error?.message || error
          );
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
  if (!ensureCloudinaryConfigured() || !publicId) return false;

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
  ensureCloudinaryConfigured,
  getSanitizedCloudinaryConfig,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
};
