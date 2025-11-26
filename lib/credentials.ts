import crypto from "crypto";

const SECRET = process.env.CREDENTIALS_SECRET || "";

function getKey() {
  if (!SECRET) return null;
  return crypto.createHash("sha256").update(SECRET).digest();
}

export function encryptJSON(payload: any): string | null {
  const key = getKey();
  if (!key) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptJSON<T = any>(encoded: string | null): T | null {
  const key = getKey();
  if (!key || !encoded) return null;
  try {
    const raw = Buffer.from(encoded, "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    return JSON.parse(decrypted) as T;
  } catch (e) {
    console.error("decryptJSON failed", e);
    return null;
  }
}
