import { Redis } from "@upstash/redis";

const USER_DAILY_LIMIT_MINUTES = 20;
const GLOBAL_DAILY_LIMIT_MINUTES = 200;
const TTL_SECONDS = 60 * 60 * 48; // 48 hours so keys always outlive the day

function hasRedisConfig(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) _redis = Redis.fromEnv();
  return _redis;
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function userKey(userId: string): string {
  return `user:${userId}:minutes:${todayUTC()}`;
}

function globalKey(): string {
  return `global:minutes:${todayUTC()}`;
}

const DEFAULT_QUOTA = {
  userUsed: 0,
  userRemaining: USER_DAILY_LIMIT_MINUTES,
  globalUsed: 0,
  globalRemaining: GLOBAL_DAILY_LIMIT_MINUTES,
  allowedMinutes: USER_DAILY_LIMIT_MINUTES,
  isBlocked: false,
};


export async function getQuota(userId: string) {
  if (!hasRedisConfig()) return DEFAULT_QUOTA;

  const [userUsed, globalUsed] = await Promise.all([
    getRedis().get<number>(userKey(userId)),
    getRedis().get<number>(globalKey()),
  ]);

  const userUsedMin = userUsed ?? 0;
  const globalUsedMin = globalUsed ?? 0;

  const userRemaining = Math.max(0, USER_DAILY_LIMIT_MINUTES - userUsedMin);
  const globalRemaining = Math.max(0, GLOBAL_DAILY_LIMIT_MINUTES - globalUsedMin);
  const allowedMinutes = Math.min(userRemaining, globalRemaining);

  return {
    userUsed: userUsedMin,
    userRemaining,
    globalUsed: globalUsedMin,
    globalRemaining,
    allowedMinutes,
    isBlocked: allowedMinutes === 0,
  };
}

export async function incrementQuota(
  userId: string,
  minutesUsed: number
): Promise<void> {
  if (!hasRedisConfig()) return;

  const uKey = userKey(userId);
  const gKey = globalKey();

  const pipe = getRedis().pipeline();
  pipe.incrbyfloat(uKey, minutesUsed);
  pipe.expire(uKey, TTL_SECONDS);
  pipe.incrbyfloat(gKey, minutesUsed);
  pipe.expire(gKey, TTL_SECONDS);
  await pipe.exec();
}

export function secondsToMinutes(seconds: number): number {
  return seconds / 60;
}
