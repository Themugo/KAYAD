import rateLimit from 'express-rate-limit';
import { getRedisClient } from './redis.js';
import { RedisStore, type RedisReply } from 'rate-limit-redis';

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string | Record<string, unknown>;
  useRedis?: boolean;
}) {
  const { windowMs, max, useRedis = false } = options;
  const message = typeof options.message === "string" ? { error: options.message } : options.message;

  if (useRedis && process.env.REDIS_URL) {
    const redisClient = getRedisClient();
    return rateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      store: new RedisStore({
        // ioredis's raw-command sender — the shape rate-limit-redis v4 actually
        // expects (a previous version of this code passed `client: redisClient`,
        // which isn't a recognized option and was masked by an `as any` cast).
        sendCommand: (...args: string[]) => {
          const [command, ...rest] = args;
          return redisClient.call(command, ...rest) as Promise<RedisReply>;
        },
        prefix: 'rate_limit:',
      }),
      message: message || { error: 'Rate limit exceeded' },
    });
  }

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: message || { error: 'Rate limit exceeded' },
  });
}
