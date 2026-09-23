const PREFIX = "pbkdf2-sha256";
const ITERATIONS = 210_000;
function hex(bytes: Uint8Array) { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""); }
async function derive(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new Uint8Array(salt), iterations: ITERATIONS }, key, 256)));
}
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `${PREFIX}$${hex(salt)}$${await derive(password, salt)}`;
}
export function isPasswordHash(password: string) { return /^pbkdf2-sha256\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(password); }
export async function verifyPassword(password: string, stored: string) {
  // Existing local accounts are migrated after a successful login.
  if (!isPasswordHash(stored)) return password === stored;
  const [, salt, expected] = stored.split("$");
  const actual = await derive(password, Uint8Array.from(salt.match(/../g)!, (byte) => parseInt(byte, 16)));
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}
