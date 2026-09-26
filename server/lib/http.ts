import type { Context } from 'hono';
import type { z } from 'zod';
import type { AppEnv } from '../types.js';
import { badRequest } from './errors.js';
import { parse } from './validate.js';

/** JSON tanani xavfsiz o'qish va sxema bo'yicha tekshirish */
export async function body<S extends z.ZodTypeAny>(c: Context<AppEnv>, schema: S): Promise<z.output<S>> {
  let data: unknown;
  try {
    const text = await c.req.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    throw badRequest('err.json');
  }
  return parse(schema, data);
}

/** URL parametrini whitelist regex bilan tekshirish */
export function param(c: Context<AppEnv>, name: string, re: RegExp): string {
  const v = c.req.param(name) ?? '';
  if (!re.test(v)) throw badRequest('err.validation');
  return v;
}

export const RE = {
  productId: /^[a-z0-9-]{2,40}$/,
  objectId: /^[a-f0-9]{24}$/,
  orderId: /^EM-[A-Z0-9]{5,12}$/,
  promo: /^[A-Z0-9]{3,20}$/,
  gift: /^[A-Z0-9-]{8,24}$/,
};
