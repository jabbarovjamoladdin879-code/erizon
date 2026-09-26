import { randomBytes } from 'node:crypto';

/** 24 belgili tasodifiy hex ID (taxmin qilib bo'lmaydi; URL validatsiyasi: /^[a-f0-9]{24}$/) */
export function newId(): string {
  return randomBytes(12).toString('hex');
}

export const ID_RE = /^[a-f0-9]{24}$/;
