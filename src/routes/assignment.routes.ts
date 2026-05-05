import { Router } from 'express';
import { assignmentController } from '@controllers';
import { requireReviewer, validate } from '@middlewares';
import {
  assignmentAssignSchema,
  assignmentBulkAssignSchema,
  assignmentCreateSchema,
  assignmentUpdateSchema,
} from '@requests';

const router = Router();

router.post('/', requireReviewer, validate(assignmentCreateSchema), assignmentController.create);

// `/bulk-assign` must come before any `/:id` route so Express doesn't try to
// match "bulk-assign" as an assignment ID.
router.post(
  '/bulk-assign',
  requireReviewer,
  validate(assignmentBulkAssignSchema),
  assignmentController.bulkAssign
);

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
