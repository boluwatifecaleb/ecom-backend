import { Queue } from 'bullmq';
import { bullConnection } from '../config/redis.js';

export const invoiceQueue = new Queue('invoiceQueue', {
  connection: bullConnection
});