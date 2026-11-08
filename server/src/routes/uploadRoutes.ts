import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  uploadMiddleware,
  uploadImage,
  deleteImage,
} from '../controllers/uploadController';

const router = Router();

// All upload endpoints are protected by user authentication
router.post('/', protect, uploadMiddleware, uploadImage);
router.delete('/', protect, deleteImage);

export default router;
