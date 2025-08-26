import { Router } from 'express';
import { allowRoles, authenticate } from '../middlewares/auth.js';
import { createBill, listBills, markBillPaid } from '../controllers/billController.js';

const router = Router();

router.get('/', authenticate, allowRoles('ADMIN', 'RESIDENT'), listBills);
router.post('/', authenticate, allowRoles('ADMIN'), createBill);
router.post('/pay', authenticate, allowRoles('ADMIN'), markBillPaid);

export default router;