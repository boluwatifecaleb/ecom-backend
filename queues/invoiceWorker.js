import { Worker } from 'bullmq';
import { bullConnection } from '../config/redis.js';
import Order from '../models/order.js';
import User from '../models/users.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// create the invoices folder if it doesn't already exist
if (!fs.existsSync('invoices')) {
  fs.mkdirSync('invoices');
}

const invoiceWorker = new Worker(
  'invoiceQueue',
  async (job) => {
    const { orderId, userId } = job.data;

    const order = await Order.findById(orderId);
    const user = await User.findById(userId);

    if (!order || !user) {
      throw new Error(`Order or user not found for job ${job.id}`);
    }

    const doc = new PDFDocument();
    const filePath = path.join('invoices', `invoice-${order._id}.pdf`);
    const writeStream = fs.createWriteStream(filePath);

    writeStream.on('error', (err) => {
      console.error(`Failed to write invoice for order ${order._id}:`, err.message);
    });

    writeStream.on('finish', () => {
      console.log(`Invoice generated for order ${order._id} at ${filePath}`);
    });

    doc.pipe(writeStream);

    doc.fontSize(20).text('Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${order._id}`);
    doc.text(`Customer: ${user.name}`);
    doc.text(`Email: ${user.email}`);
    doc.moveDown();

    order.items.forEach((item) => {
      doc.text(`${item.name} — Qty: ${item.quantity} — $${item.price}`);
    });

    doc.moveDown();
    doc.fontSize(14).text(`Total: $${order.totalAmount}`, { align: 'right' });

    doc.end();
  },
  { connection: bullConnection }
);

invoiceWorker.on('completed', (job) => {
  console.log(`Invoice job ${job.id} completed`);
});

invoiceWorker.on('failed', (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    console.error(`Invoice job ${job.id} permanently failed:`, err.message);
  } else {
    console.warn(`Invoice job ${job.id} failed attempt ${job.attemptsMade}, will retry:`, err.message);
  }
});