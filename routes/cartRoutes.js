import express from 'express';
import { getCart, addToCart, removeFromCart, updateQuantity } from '../controllers/cartController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate, validateParams } from '../middleware/validate.js';
import { addToCartSchema, updateQuantitySchema, productIdParamSchema } from '../validators/cartValidators.js';

const router = express.Router();

router.get('/', protect, getCart);
router.post('/add', protect, validate(addToCartSchema), addToCart);
router.delete('/remove/:productId', protect, validateParams(productIdParamSchema), removeFromCart);
router.put('/update/:productId', protect, validateParams(productIdParamSchema), validate(updateQuantitySchema), updateQuantity);

export default router;