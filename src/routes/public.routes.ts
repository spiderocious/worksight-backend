import { Router } from 'express';
import { downloadsController, inviteController } from '@controllers';

const router = Router();

router.get('/downloads', downloadsController.get);
router.get('/invite/:code', inviteController.resolve);

export default router;
