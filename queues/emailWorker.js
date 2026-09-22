import { Worker } from 'bullmq';
import { bullConnection } from '../config/redis.js';

export const emailWorker = new Worker(
  'emailQueue',
  async (job) => {
    console.log(`Processing job ${job.id}: ${job.name}`);
    console.log('Job data:', job.data);

    throw new Error('Simulated failure for testing purposes');
  },
  { connection: bullConnection }
);

emailWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  if (job.attemptsMade >= job.opts.attempts) {
    console.error(`Job ${job.id} permanently failed after ${job.attemptsMade} attempts:`, err.message);
    // this is where you'd log to a monitoring service, send yourself an alert, etc.
  } else {
    console.warn(`Job ${job.id} failed attempt ${job.attemptsMade}, will retry:`, err.message);
  }
});