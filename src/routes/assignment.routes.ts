import { Router } from 'express';
import { assignmentController } from '@controllers';
import { requireReviewer, validate } from '@middlewares';
import {
  assignmentAssignSchema,
  assignmentCreateSchema,
  assignmentUpdateSchema,
} from '@requests';

const router = Router();

router.post('/', requireReviewer, validate(assignmentCreateSchema), assignmentController.create);
router.get('/', requireReviewer, assignmentController.list);
router.get('/:id', requireReviewer, assignmentController.getOne);
router.patch('/:id', requireReviewer, validate(assignmentUpdateSchema), assignmentController.update);
router.delete('/:id', requireReviewer, assignmentController.remove);
router.post(
  '/:id/assign',
  requireReviewer,
  validate(assignmentAssignSchema),
  assignmentController.assign
);

export default router;
