import { Router } from 'express';
import { allowRoles, authenticate } from '../middlewares/auth.js';
import { createComplaint, listComplaints, updateComplaintStatus } from '../controllers/complaintController.js';

const router = Router();

router.get('/', authenticate, allowRoles('ADMIN', 'RESIDENT'), listComplaints);
router.post('/', authenticate, allowRoles('RESIDENT', 'ADMIN'), createComplaint);
router.post('/status', authenticate, allowRoles('ADMIN'), updateComplaintStatus);

export default router;