import Redis from "ioredis";

interface CacheItem<T> {
  data: T;
  expires: number;
}

export class CacheManager {
  private redis: Redis | null = null;
  private localCache: Map<string, CacheItem<any>> = new Map();
  private defaultTTL: number = 300; // 5 minutes

  constructor(redisUrl?: string) {
    if (redisUrl && typeof window === "undefined") {
      // Only initialize Redis on server-side
      try {
        this.redis = new Redis(redisUrl);
        this.redis.on("error", (err) => {
          console.error("Redis connection error:", err);
          this.redis = null;
        });
      } catch (error) {
        console.error("Failed to initialize Redis:", error);
      }
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    // Check local cache first
    if (this.localCache.has(key)) {
      const cached = this.localCache.get(key)!;
      if (cached.expires > Date.now()) {
        return cached.data;
      }
      this.localCache.delete(key);
    }

    // Check Redis if available
    if (this.redis) {
      try {
        const cached = await this.redis.get(key);
        if (cached) {
          const data = JSON.parse(cached);
          this.localCache.set(key, {
            data,
            expires: Date.now() + this.defaultTTL * 1000,
          });
          return data;
        }
      } catch (error) {
        console.error("Redis get error:", error);
      }
    }

    return null;
  }

  async set<T = any>(key: string, data: T, ttl?: number): Promise<void> {
    const expiry = ttl || this.defaultTTL;

    // Store in local cache
    this.localCache.set(key, {
      data,
      expires: Date.now() + expiry * 1000,
    });

    // Store in Redis if available
    if (this.redis) {
      try {
        await this.redis.setex(key, expiry, JSON.stringify(data));
      } catch (error) {
        console.error("Redis set error:", error);
      }
    }
  }

  async invalidate(key: string): Promise<void> {
    this.localCache.delete(key);
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.error("Redis delete error:", error);
      }
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Clear local cache matching pattern
    for (const [key] of this.localCache) {
      if (this.matchesPattern(key, pattern)) {
        this.localCache.delete(key);
      }
    }

    // Clear Redis matching pattern
    if (this.redis) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.error("Redis pattern delete error:", error);
      }
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    const regexPattern = pattern.replace(/\*/g, ".*");
    return new RegExp(`^${regexPattern}$`).test(key);
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
