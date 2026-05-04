import { Router } from 'express';
import { assignmentController } from '@controllers';
import { requireReviewer } from '@middlewares';

const router = Router();

router.get('/', requireReviewer, assignmentController.listInstances);

export default router;
