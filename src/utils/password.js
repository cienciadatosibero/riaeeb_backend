import crypto from 'node:crypto';

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

export function hashPassword(password) {
  const value = String(password || '');
  if (value.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(value, salt, KEYLEN, { N, r: R, p: P }).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  try {
    const [kind, salt, hex] = String(stored || '').split('$');
    if (kind !== 'scrypt' || !salt || !hex) return false;
    const expected = Buffer.from(hex, 'hex');
    const actual = crypto.scryptSync(String(password || ''), salt, expected.length, { N, r: R, p: P });
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
