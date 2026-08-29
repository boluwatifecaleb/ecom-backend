import express from 'express';
import { checkout, getOrders,
        initializePayment, verifyPayment
 } from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/checkout', protect, checkout);
router.get('/my-orders', protect, getOrders);
router.post('/:orderId/pay', protect, initializePayment);
router.get('/verify/:reference', protect, verifyPayment);

export default router;