import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {registerUser, loginUser } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get ('/profile', protect, (req, res) => {
    res.status(200).json({message: 'You have been authenticated', user: req.user});
});

export default router;