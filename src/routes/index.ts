import { Router } from 'express';
import healthRoutes from './health.routes';
import reviewerRoutes from './reviewer.routes';
import candidateRoutes from './candidate.routes';
import assignmentRoutes from './assignment.routes';
import instanceRoutes from './instance.routes';
import candidatePortalRoutes from './candidate-portal.routes';
import sessionRoutes from './session.routes';
import blocklistRoutes from './blocklist.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/reviewers', reviewerRoutes);
router.use('/candidates', candidateRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/assignment-instances', instanceRoutes);
router.use('/candidate', candidatePortalRoutes);
router.use('/sessions', sessionRoutes);
router.use('/blocklist', blocklistRoutes);

export default router;
