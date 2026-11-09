import express from 'express';
import { checkout, getOrders,
        initializePayment, verifyPayment
 } from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateParams } from '../middleware/validate.js';
import { orderIdParamSchema, referenceParamSchema } from '../validators/orderValidators.js';
import { verifyWebhookSignature } from '../middleware/verifyWebhookSignature.js';

const router = express.Router();

router.post('/checkout', protect, checkout);
router.get('/my-orders', protect, getOrders);
router.post('/webhook', verifyWebhookSignature, (req, res) => {
  const event = JSON.parse(req.body.toString());
  console.log('Verified webhook received:', event.event, event.data?.reference);
  res.sendStatus(200);
});
router.post('/:orderId/pay', protect, validateParams(orderIdParamSchema), initializePayment);
router.get('/verify/:reference', protect, validateParams(referenceParamSchema), verifyPayment);

export default router;