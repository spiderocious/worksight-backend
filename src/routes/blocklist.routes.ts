import { Router } from 'express';
import { blocklistController } from '@controllers';

const router = Router();

router.get('/', blocklistController.get);

export default router;
