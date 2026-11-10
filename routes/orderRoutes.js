import express from 'express';
import {
  checkout, getOrders, initializePayment, verifyPayment, handleWebhook,
} from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { idempotency } from '../middleware/idempotency.js';
import { verifyWebhookSignature } from '../middleware/verifyWebhookSignature.js';
import { validateParams } from '../middleware/validate.js';
import { orderIdParamSchema, referenceParamSchema } from '../validators/orderValidators.js';

const router = express.Router();

router.post('/checkout', protect, idempotency, checkout);
router.get('/my-orders', protect, getOrders);
router.post('/webhook', verifyWebhookSignature, handleWebhook);
router.post('/:orderId/pay', protect, validateParams(orderIdParamSchema), initializePayment);
router.get('/verify/:reference', protect, validateParams(referenceParamSchema), verifyPayment);

export default router;