import { Router } from 'express';
import authRoutes from './auth.js';
import towerRoutes from './towers.js';
import flatRoutes from './flats.js';
import billRoutes from './bills.js';
import complaintRoutes from './complaints.js';

const router = Router();

router.get('/', (_req, res) => {
	res.json({ api: 'Society Management API', version: 'v1' });
});

router.use('/auth', authRoutes);
router.use('/towers', towerRoutes);
router.use('/flats', flatRoutes);
router.use('/bills', billRoutes);
router.use('/complaints', complaintRoutes);

export default router;