const hits: Record<string, { count: number; resetAt: number }> = {};

export function rateLimitOk(ip: string, limit: number, windowMs: number) {
  const now = Date.now();
  const cur = hits[ip] && hits[ip].resetAt > now ? hits[ip] : { count: 0, resetAt: now + windowMs };
  cur.count += 1;
  hits[ip] = cur;
  return cur.count <= limit;
}


