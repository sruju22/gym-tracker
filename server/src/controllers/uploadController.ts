import { Response } from 'express';
import multer from 'multer';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import User from '../models/User';
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  UploadFolder,
} from '../services/cloudinaryService';

// Configure Multer memory storage (keeps files in RAM buffer, no temp disk writes)
const storage = multer.memoryStorage();

// File type filter: strict image types only
const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
  ];

  if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, GIF, and HEIC images are allowed.'));
  }
};

// 10 MB file size limit
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
}).single('image');

/**
 * Upload an image buffer directly to Cloudinary
 * POST /api/upload
 */
export async function uploadImage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided in the request' });
      return;
    }

    const folderType = (req.body.folder || 'avatars') as UploadFolder;
    const validFolders: UploadFolder[] = ['avatars', 'exercises', 'progress_photos'];

    if (!validFolders.includes(folderType)) {
      res.status(400).json({ error: `Invalid folder type. Expected one of: ${validFolders.join(', ')}` });
      return;
    }

    const userId = req.user?._id?.toString() || 'user';
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, folderType, userId);

    // If uploading a user avatar, automatically update the user's avatarUrl in MongoDB
    if (folderType === 'avatars' && req.user?._id) {
      await User.findByIdAndUpdate(req.user._id, { avatarUrl: uploadResult.url });
    }

    res.status(200).json({
      message: 'Image uploaded successfully to Cloudinary',
      image: uploadResult,
    });
  } catch (error: any) {
    console.error('[UploadController] Cloudinary upload error:', error);
    res.status(500).json({
      error: error.message || 'Failed to upload image to cloud storage',
    });
  }
}

/**
 * Delete an image from Cloudinary by public ID
 * DELETE /api/upload
 */
export async function deleteImage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { publicId } = req.body;

    if (!publicId || typeof publicId !== 'string') {
      res.status(400).json({ error: 'publicId is required in request body' });
      return;
    }

    const success = await deleteFromCloudinary(publicId);

    if (success) {
      res.status(200).json({ message: 'Image deleted from cloud storage successfully' });
    } else {
      res.status(404).json({ error: 'Asset not found or already deleted' });
    }
  } catch (error: any) {
    console.error('[UploadController] Cloudinary delete error:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete image from cloud storage',
    });
  }
}
