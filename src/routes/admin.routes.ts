import { Router } from 'express';
import { adminController } from '@controllers';
import { requireAdmin, validate } from '@middlewares';
import {
  adminLoginSchema,
  blocklistUpdateSchema,
  downloadsUpdateSchema,
} from '@requests';

const router = Router();

// Public — bootstrap (one-shot) + login
router.post('/setup', adminController.setup);
router.post('/login', validate(adminLoginSchema), adminController.login);

// Authed
router.get('/me', requireAdmin, adminController.me);
router.get('/stats', requireAdmin, adminController.stats);
router.get('/users/reviewers', requireAdmin, adminController.listReviewers);
router.get('/users/candidates', requireAdmin, adminController.listCandidates);

router.get('/downloads', requireAdmin, adminController.getDownloads);
router.patch(
  '/downloads',
  requireAdmin,
  validate(downloadsUpdateSchema),
  adminController.updateDownloads
);

router.get('/blocklist', requireAdmin, adminController.getBlocklist);
router.patch(
  '/blocklist',
  requireAdmin,
  validate(blocklistUpdateSchema),
  adminController.updateBlocklist
);

export default router;
