/**
 * Client-side request cache to prevent duplicate API calls
 * within the same page load/session
 */
class RequestCache {
  private cache = new Map<string, Promise<any>>();
  private results = new Map<string, any>();
  private timestamps = new Map<string, number>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached result or execute the request function
   */
  async get<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Check if we have a fresh cached result
    if (this.results.has(key)) {
      const timestamp = this.timestamps.get(key) || 0;
      const now = Date.now();
      
      if (now - timestamp < this.TTL) {
        console.log(`[RequestCache] Using cached result for: ${key}`);
        return this.results.get(key);
      } else {
        // Expired, remove from cache
        this.results.delete(key);
        this.timestamps.delete(key);
      }
    }

    // Check if request is already in progress
    if (this.cache.has(key)) {
      console.log(`[RequestCache] Waiting for in-progress request: ${key}`);
      return await this.cache.get(key)!;
    }

    // Execute new request
    console.log(`[RequestCache] Executing new request: ${key}`);
    const promise = requestFn();
    this.cache.set(key, promise);

    try {
      const result = await promise;
      // Cache the result
      this.results.set(key, result);
      this.timestamps.set(key, Date.now());
      // Remove from pending cache
      this.cache.delete(key);
      return result;
    } catch (error) {
      // Remove from pending cache on error
      this.cache.delete(key);
      throw error;
    }
  }

  /**
   * Generate cache key for relationship options
   */
  getOptionsKey(componentName: string, limit?: number, orderBy?: string, direction?: string): string {
    return `options:${componentName}:${limit || 100}:${orderBy || 'name'}:${direction || 'asc'}`;
  }

  /**
   * Generate cache key for GraphQL operations
   */
  getOperationKey(operationName: string, variables?: any): string {
    const varsKey = variables ? JSON.stringify(variables) : '';
    return `operation:${operationName}:${varsKey}`;
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    this.results.clear();
    this.timestamps.clear();
  }

  /**
   * Clear specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.results.delete(key);
    this.timestamps.delete(key);
  }

  /**
   * Clear cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
    
    for (const key of this.results.keys()) {
      if (regex.test(key)) {
        this.results.delete(key);
        this.timestamps.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { cached: number; pending: number; expired: number } {
    const now = Date.now();
    let expired = 0;
    
    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now - timestamp >= this.TTL) {
        expired++;
      }
    }
    
    return {
      cached: this.results.size,
      pending: this.cache.size,
      expired
    };
  }
}

// Export singleton instance
export const requestCache = new RequestCache();