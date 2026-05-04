import crypto from 'crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export const generateId = (length = 16, prefix?: string): string => {
  const buf = crypto.randomBytes(length);
  let s = '';
  for (let i = 0; i < length; i++) s += ALPHABET[buf[i] % ALPHABET.length];
  return prefix ? `${prefix}_${s}` : s;
};

export const generateAccessCode = (): string => generateId(10);
