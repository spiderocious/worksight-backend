import { Router } from 'express';
import { downloadsController } from '@controllers';

const router = Router();

router.get('/downloads', downloadsController.get);

export default router;
