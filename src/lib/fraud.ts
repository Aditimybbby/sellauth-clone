import { db } from './db';
import { blacklist } from './db/schema';
import { eq, and } from 'drizzle-orm';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export async function isBlacklisted(email: string, ip: string): Promise<{ blocked: boolean; reason?: string }> {
  const entries = await db.query.blacklist.findMany();

  for (const entry of entries) {
    if (entry.type === 'EMAIL' && entry.value.toLowerCase() === email.toLowerCase()) {
      return { blocked: true, reason: entry.reason || 'Email is blacklisted' };
    }
    if (entry.type === 'IP' && entry.value === ip) {
      return { blocked: true, reason: entry.reason || 'IP address is blacklisted' };
    }
  }

  return { blocked: false };
}

export function checkRateLimit(ip: string, maxRequests: number = 10, windowMs: number = 3600000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return false;
  }

  return true;
}
