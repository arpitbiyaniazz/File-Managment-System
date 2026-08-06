// ============================================
// File Routes
// ============================================
// Maps URLs to controllers and applies middleware.
// ============================================

import express, { Router } from 'express';
import { createAuthMiddleware } from '@file-manager/shared-utils';
import { config } from '../config';
import * as fileController from '../controllers/file.controller';
import { upload } from '../middlewares/upload.middleware';

const router: Router = express.Router();

// Create auth middleware instance for this service
// Note: We don't have token blacklisting implemented in file-service yet,
// so we'll pass a dummy checker or skip it for now.
const authenticate = createAuthMiddleware({
  jwtSecret: config.jwt.secret,
  isTokenBlacklisted: async () => false, 
});

// All file routes are protected
router.use(authenticate);

// Upload a file (single file upload under the 'file' field)
router.post('/upload', upload.single('file'), fileController.uploadFile);

// Download a file
router.get('/:id/download', fileController.downloadFile);

// Delete a file
router.delete('/:id', fileController.deleteFile);

export default router;
