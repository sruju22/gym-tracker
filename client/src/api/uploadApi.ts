import { API_BASE_URL } from './config';
import { getStoredToken } from './authApi';

export type UploadFolder = 'avatars' | 'exercises' | 'progress_photos';

export interface UploadResponse {
  message: string;
  image: {
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
  };
}

/**
 * Uploads an image file to Cloudinary via the backend upload microservice.
 * Automatically handles JWT authentication and multipart boundary headers.
 */
export async function uploadImageApi(
  file: File,
  folder: UploadFolder = 'avatars'
): Promise<UploadResponse['image']> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Please sign in to upload images');
  }

  // Validate image file type on client before upload
  const validMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
  ];
  if (!validMimes.includes(file.type.toLowerCase())) {
    throw new Error('Please select a valid image file (JPEG, PNG, WebP, or GIF)');
  }

  // Validate size limit (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image size must be less than 10 MB');
  }

  const formData = new FormData();
  formData.append('image', file);
  formData.append('folder', folder);

  const res = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Note: Do NOT set Content-Type manually when passing FormData,
      // the browser automatically sets multipart/form-data with the correct boundary!
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload failed with status ${res.status}`);
  }

  const data: UploadResponse = await res.json();
  return data.image;
}

/**
 * Deletes an uploaded asset from Cloudinary by its publicId.
 */
export async function deleteImageApi(publicId: string): Promise<boolean> {
  const token = getStoredToken();
  if (!token) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/upload`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ publicId }),
    });

    return res.ok;
  } catch (err) {
    console.warn('[UploadApi] Failed to delete image asset:', err);
    return false;
  }
}
