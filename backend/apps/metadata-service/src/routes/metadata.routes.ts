// ============================================
// Metadata Routes
// ============================================
// All routes are JWT-protected. Grouped by resource type.
// ============================================

import express, { Router } from 'express';
import { createAuthMiddleware } from '@file-manager/shared-utils';
import { config } from '../config';
import * as ctrl from '../controllers/metadata.controller';

const router: Router = express.Router();

const authenticate = createAuthMiddleware({
  jwtSecret: config.jwt.secret,
});

// All metadata routes require authentication
router.use(authenticate);

// ---- Folder Routes ----
router.post('/folders', ctrl.createFolder);
router.get('/folders/:id', ctrl.getFolder);
router.get('/folders/:id/contents', ctrl.getFolderContents);
router.patch('/folders/:id', ctrl.renameFolder);
router.post('/folders/:id/move', ctrl.moveFolder);
router.delete('/folders/:id', ctrl.deleteFolder);

// ---- File Metadata Routes ----
router.get('/files', ctrl.listFiles);
router.get('/files/:id', ctrl.getFile);
router.patch('/files/:id/rename', ctrl.renameFile);
router.patch('/files/:id/move', ctrl.moveFile);

// ---- Share Routes ----
router.post('/share', ctrl.createShareEndpoint);
router.get('/shared-with-me', ctrl.getSharedWithMe);
router.delete('/share/:id', ctrl.revokeShare);

export default router;
