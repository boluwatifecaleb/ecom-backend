import express from 'express';
import { getRevenueByStatus, getTopProducts } from '../controllers/analyticsController.js';

const router = express.Router();

// Instructs the application: "If a user sends an HTTP GET web request specifically to the link 
// ending in /revenue-by-status, run the getRevenueByStatus controller function immediately.
router.get('/revenue-by-status', getRevenueByStatus);
router.get('/top-products', getTopProducts);

export default router;