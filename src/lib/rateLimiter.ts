/**
 * A simple in-memory rate limiter to respect Zoho API limits (120 RPM).
 * Note: In serverless environments (like Vercel), this only works per-instance.
 */

class RateLimiter {
  private requests: number[] = [];
  private limit: number;
  private interval: number;

  constructor(limit: number, intervalMs: number) {
    this.limit = limit;
    this.interval = intervalMs;
  }

  /**
   * Checks if a request is allowed. Returns true if allowed, false if rate-limited.
   */
  async check(): Promise<boolean> {
    const now = Date.now();
    // Remove requests outside the interval window
    this.requests = this.requests.filter(time => now - time < this.interval);

    if (this.requests.length < this.limit) {
      this.requests.push(now);
      return true;
    }

    return false;
  }

  /**
   * Waits until a request can be made, or throws if it takes too long.
   */
  async wait(maxWaitMs: number = 5000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      if (await this.check()) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error("Rate limit wait timeout");
  }
}

// Zoho limit is 120 requests per minute. 
// We'll use a conservative limit of 100 per minute per instance to be safe.
export const zohoRateLimiter = new RateLimiter(100, 60000);

// Also a short-term cache to prevent redundant calls within seconds
const cache = new Map<string, { data: any, expiry: number }>();

export function getCachedData(key: string) {
  const item = cache.get(key);
  if (item && Date.now() < item.expiry) {
    return item.data;
  }
  return null;
}

export function setCachedData(key: string, data: any, ttlSeconds: number = 10) {
  cache.set(key, {
    data,
    expiry: Date.now() + (ttlSeconds * 1000)
  });
}
