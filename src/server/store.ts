import { Redis } from "@upstash/redis";

export type Store = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  incr(key: string, ttlSeconds: number): Promise<number>;
};

const prefix = `ventanilla:${process.env.COUNTRY ?? "co"}:`;

function memoryStore(capacity = 2000): Store {
  const entries = new Map<string, { value: unknown; expires: number }>();
  const live = (key: string) => {
    const entry = entries.get(key);
    if (!entry) return undefined;
    if (entry.expires > Date.now()) return entry;
    entries.delete(key);
    return undefined;
  };
  const put = (key: string, value: unknown, ttlSeconds: number) => {
    entries.delete(key);
    entries.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
    if (entries.size > capacity) entries.delete(entries.keys().next().value!);
  };
  return {
    get: async <T>(key: string) => (live(key)?.value as T) ?? null,
    set: async (key, value, ttlSeconds) => put(key, value, ttlSeconds),
    incr: async (key, ttlSeconds) => {
      const entry = live(key);
      const next = ((entry?.value as number) ?? 0) + 1;
      if (entry) entry.value = next;
      else put(key, next, ttlSeconds);
      return next;
    },
  };
}

function redisStore(redis: Redis): Store {
  return {
    get: (key) => redis.get(prefix + key),
    set: async (key, value, ttlSeconds) => {
      await redis.set(prefix + key, value, { ex: ttlSeconds });
    },
    incr: async (key, ttlSeconds) => {
      const [count] = await redis.pipeline().incr(prefix + key).expire(prefix + key, ttlSeconds, "NX").exec<[number, number]>();
      return count;
    },
  };
}

const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = process.env;

export const store: Store = url && token ? redisStore(new Redis({ url, token })) : memoryStore();

export const storeKind = url && token ? "redis" : "memory";
