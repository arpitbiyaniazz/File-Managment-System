// ============================================
// Search Routes
// ============================================

import express, { Router } from 'express';
import { createAuthMiddleware } from '@file-manager/shared-utils';
import { config } from '../config';
import * as searchCtrl from '../controllers/search.controller';

const router: Router = express.Router();

const authenticate = createAuthMiddleware({
  jwtSecret: config.jwt.secret,
});

// All search routes require authentication
router.use(authenticate);

// Client search & suggest
router.get('/', searchCtrl.search);
router.get('/suggest', searchCtrl.suggest);

// Index management & sync
router.post('/index', searchCtrl.indexItem);
router.delete('/index/:id', searchCtrl.deleteIndexItem);
router.post('/reindex', searchCtrl.reindex);

export default router;
