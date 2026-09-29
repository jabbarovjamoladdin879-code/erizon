import type { z } from 'zod';
import { ApiError } from './errors.js';

/**
 * NoSQL injection himoyasi: `$` yoki `.` bilan boshlanadigan kalitlar (masalan, {"$gt": ""})
 * so'rov tanasida bo'lsa — so'rov rad etiladi. Bundan tashqari Zod sxemalari faqat
 * primitiv qiymatlarni qabul qiladi, shuning uchun operator obyektlari bazaga yetib bormaydi.
 */
function assertNoOperators(value: unknown, depth = 0): void {
  if (depth > 12) throw new ApiError(400, 'err.validation');
  if (Array.isArray(value)) {
    if (value.length > 500) throw new ApiError(400, 'err.validation');
    for (const v of value) assertNoOperators(v, depth + 1);
    return;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new ApiError(400, 'err.validation');
      }
      assertNoOperators((value as Record<string, unknown>)[key], depth + 1);
    }
  }
}

/** Zod bilan tekshirish; xato bo'lsa maydonlar bo'yicha i18n kalitlari qaytariladi */
export function parse<S extends z.ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  assertNoOperators(data);
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || '_';
      if (!fields[path]) fields[path] = issue.message.includes('.') ? issue.message : 'err.validation';
    }
    throw new ApiError(400, 'err.validation', { fields });
  }
  return result.data;
}
