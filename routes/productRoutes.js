import express from 'express';
import { validate } from '../middleware/validate.js';
import { createProductSchema, updateProductSchema } from '../validators/productValidators.js';
import { createProduct, getAllProducts, getProductsFeed,  
    getProductById, updateProduct,
  deleteProduct,} from '../controllers/productController.js';

const router = express.Router();

router.post('/', validate(createProductSchema), createProduct);
router.get('/feed', getProductsFeed);
router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.put('/:id', validate(updateProductSchema), updateProduct);
router.delete('/:id', deleteProduct);

export default router;