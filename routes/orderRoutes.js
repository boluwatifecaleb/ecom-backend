import express from 'express';
import { checkout, getOrders,
        initializePayment, verifyPayment
 } from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateParams } from '../middleware/validate.js';
import { orderIdParamSchema, referenceParamSchema } from '../validators/orderValidators.js';

const router = express.Router();

router.post('/checkout', protect, checkout);
router.get('/my-orders', protect, getOrders);
router.post('/:orderId/pay', protect, validateParams(orderIdParamSchema), initializePayment);
router.get('/verify/:reference', protect, validateParams(referenceParamSchema), verifyPayment);

export default router;