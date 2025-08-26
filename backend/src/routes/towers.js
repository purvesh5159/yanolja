import { Router } from 'express';
import { allowRoles, authenticate } from '../middlewares/auth.js';
import { createTower, listTowers } from '../controllers/towerController.js';

const router = Router();

router.get('/', authenticate, listTowers);
router.post('/', authenticate, allowRoles('ADMIN'), createTower);

export default router;