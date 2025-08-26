import { Router } from 'express';
import { allowRoles, authenticate } from '../middlewares/auth.js';
import { createFlat, listFlats, assignUserToFlat } from '../controllers/flatController.js';

const router = Router();

router.get('/', authenticate, allowRoles('ADMIN', 'RESIDENT'), listFlats);
router.post('/', authenticate, allowRoles('ADMIN'), createFlat);
router.post('/assign', authenticate, allowRoles('ADMIN'), assignUserToFlat);

export default router;