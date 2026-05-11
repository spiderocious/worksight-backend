import { Router } from 'express';
import { assignmentController } from '@controllers';
import { requireReviewer, validate } from '@middlewares';
import { instanceUpdateDeadlineSchema } from '@requests';

const router = Router();

router.get('/', requireReviewer, assignmentController.listInstances);
router.patch(
  '/:id/deadline',
  requireReviewer,
  validate(instanceUpdateDeadlineSchema),
  assignmentController.updateInstanceDeadline
);

export default router;
