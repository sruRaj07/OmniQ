import Redis from 'ioredis';
import dotenv from 'dotenv';

import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '../../../.env') });

// Fallback to localhost if no Azure Cache string is provided
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  tls: REDIS_URL.startsWith('rediss://') 
    ? { servername: new URL(REDIS_URL).hostname } 
    : undefined,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Successfully connected to Redis');
});
