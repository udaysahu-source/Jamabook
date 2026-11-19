// src/lib/appLock.ts
// Client-side salted app lock PIN using WebCrypto PBKDF2

const PIN_STORAGE_KEY = 'jamabook_app_lock_pin_hash';
const PIN_SALT_KEY = 'jamabook_app_lock_salt';

export async function hashPin(pin: string, salt: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback for non-WebCrypto environments
    return `hash-${salt}-${pin}`;
  }

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const exported = await crypto.subtle.exportKey('raw', key);
  return Array.from(new Uint8Array(exported))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function setAppLockPin(pin: string): Promise<void> {
  const salt = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  const hash = await hashPin(pin, salt);
  localStorage.setItem(PIN_STORAGE_KEY, hash);
  localStorage.setItem(PIN_SALT_KEY, salt);
}

export async function verifyAppLockPin(pin: string): Promise<boolean> {
  const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
  const salt = localStorage.getItem(PIN_SALT_KEY);

  if (!storedHash || !salt) {
    // No PIN configured yet
    return true;
  }

  const computedHash = await hashPin(pin, salt);
  return computedHash === storedHash;
}

export function hasAppLockPinSet(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem(PIN_STORAGE_KEY));
}

export function removeAppLockPin(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.removeItem(PIN_SALT_KEY);
}
