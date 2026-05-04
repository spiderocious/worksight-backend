import { Router } from 'express';
import {
  reviewerController,
  reviewerSettingsController,
  sessionRuleController,
} from '@controllers';
import { validate, requireReviewer } from '@middlewares';
import {
  reviewerLoginSchema,
  reviewerPasswordSchema,
  reviewerSignupSchema,
  reviewerUpdateSchema,
  ruleCreateSchema,
  ruleUpdateSchema,
  settingsUpdateSchema,
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

// Reviewer settings (post-submission text, screenshot warning, interval).
router.get('/me/settings', requireReviewer, reviewerSettingsController.get);
router.patch(
  '/me/settings',
  requireReviewer,
  validate(settingsUpdateSchema),
  reviewerSettingsController.update
);

// Session rules — reviewer-controlled list shown to candidates before they start.
router.get('/me/rules', requireReviewer, sessionRuleController.list);
router.post(
  '/me/rules',
  requireReviewer,
  validate(ruleCreateSchema),
  sessionRuleController.create
);
router.patch(
  '/me/rules/:id',
  requireReviewer,
  validate(ruleUpdateSchema),
  sessionRuleController.update
);
router.delete('/me/rules/:id', requireReviewer, sessionRuleController.remove);

export default router;
