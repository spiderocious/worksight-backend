import { Router } from 'express';
import { reviewerController } from '@controllers';
import { validate, requireReviewer } from '@middlewares';
import {
  reviewerLoginSchema,
  reviewerPasswordSchema,
  reviewerSignupSchema,
  reviewerUpdateSchema,
} from '@requests';

const router = Router();

router.post('/signup', validate(reviewerSignupSchema), reviewerController.signup);
router.post('/login', validate(reviewerLoginSchema), reviewerController.login);

router.get('/me', requireReviewer, reviewerController.me);
router.patch('/me', requireReviewer, validate(reviewerUpdateSchema), reviewerController.updateMe);
router.patch(
  '/me/password',
  requireReviewer,
  validate(reviewerPasswordSchema),
  reviewerController.updatePassword
);

export default router;
