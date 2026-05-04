import { Router } from 'express';
import { scoreController, sessionController } from '@controllers';
import { requireReviewer, validate } from '@middlewares';
import { scoreSchema } from '@requests';

const router = Router();

// Reviewer-side session viewing & scoring
router.get('/:id', requireReviewer, sessionController.getReviewer);
router.post('/:id/score', requireReviewer, validate(scoreSchema), scoreController.upsert);
router.patch('/:id/score', requireReviewer, validate(scoreSchema), scoreController.upsert);
router.get('/:id/score', requireReviewer, scoreController.get);

export default router;
