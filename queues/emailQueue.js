import { Queue } from 'bullmq';
import { bullConnection } from '../config/redis.js';

// emailQueue is the queue's name in Redis 
// the worker and the producer(Queue) must use the same name to communicate with each other.
export const emailQueue = new Queue('emailQueue', {
  connection: bullConnection,
});