import crypto from "node:crypto";

function decodeKeyFromEnv() {
  const rawKey = process.env.WAITLIST_ENC_KEY;

  if (!rawKey) {
    throw new Error("WAITLIST_ENC_KEY nao definido.");
  }

  const key = Buffer.from(rawKey, "base64");

  if (key.length !== 32) {
    throw new Error("WAITLIST_ENC_KEY deve ser base64 de 32 bytes.");
  }

  return key;
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function encryptValue(value) {
  const key = decodeKeyFromEnv();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    alg: "AES-256-GCM",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: encrypted.toString("base64")
  };
}

export function decryptValue(payload) {
  const key = decodeKeyFromEnv();

  if (!payload || payload.alg !== "AES-256-GCM") {
    throw new Error("Payload criptografado invalido.");
  }

  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}
