import { Router } from 'express';
import { candidateController, scoreController } from '@controllers';
import { requireReviewer, validate } from '@middlewares';
import { candidateAuthSchema, candidateCreateSchema, candidateUpdateSchema } from '@requests';

const router = Router();

// Reviewer-scoped candidate management
router.post('/', requireReviewer, validate(candidateCreateSchema), candidateController.create);
router.get('/', requireReviewer, candidateController.list);
router.get('/:id', requireReviewer, candidateController.getOne);
router.patch('/:id', requireReviewer, validate(candidateUpdateSchema), candidateController.update);
router.patch('/:id/deactivate', requireReviewer, candidateController.deactivate);
router.post('/:id/regenerate-code', requireReviewer, candidateController.regenerate);
router.get('/:candidateId/history', requireReviewer, scoreController.history);

// Public candidate auth (electron app)
router.post('/auth/exchange', validate(candidateAuthSchema), candidateController.exchange);

export default router;
