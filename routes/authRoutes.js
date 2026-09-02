import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {validate } from '../middleware/validate.js';
import {registerSchema, loginSchema} from '../validators/authValidators.js';
import {registerUser, loginUser } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.get ('/profile', protect, (req, res) => {
    res.status(200).json({message: 'You have been authenticated', user: req.user});
});

export default router;