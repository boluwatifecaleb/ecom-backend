import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authroutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import cookieParser from 'cookie-parser';
import './queues/emailWorker.js';
import './queues/invoiceWorker.js';

const app = express();
const PORT = process.env.PORT || 5000;

dotenv.config();
app.use(cookieParser());
app.use(express.json());
app.use('/api/auth/', rateLimiter);
app.use('/api/auth', authroutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/carts', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${mongoose.connection.host} / db: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

app.get('/', (req, res) => {
    res.send('API is running ...')
});

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
