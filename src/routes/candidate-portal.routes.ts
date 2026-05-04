import { Router } from 'express';
import { candidatePortalController, sessionController } from '@controllers';
import { requireCandidate, validate } from '@middlewares';
import {
  sessionAbnormalSchema,
  sessionScreenshotSchema,
  sessionStartSchema,
  sessionSubmitSchema,
} from '@requests';

const router = Router();

router.get('/me', requireCandidate, candidatePortalController.me);
router.get('/assignments/:instanceId', requireCandidate, candidatePortalController.instance);

router.post(
  '/sessions/start',
  requireCandidate,
  validate(sessionStartSchema),
  sessionController.start
);
router.get('/sessions/:id', requireCandidate, sessionController.getCandidate);
router.post(
  '/sessions/:id/screenshots',
  requireCandidate,
  validate(sessionScreenshotSchema),
  sessionController.screenshot
);
router.post(
  '/sessions/:id/submit',
  requireCandidate,
  validate(sessionSubmitSchema),
  sessionController.submit
);
router.post(
  '/sessions/:id/report-abnormal',
  requireCandidate,
  validate(sessionAbnormalSchema),
  sessionController.reportAbnormal
);

export default router;
