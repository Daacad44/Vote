import crypto from "crypto";
import { env } from "../config/env";

const KEY = Buffer.from(env.VOTE_AES_KEY_BASE64, "base64");

if (KEY.length !== 32) {
  throw new Error("VOTE_AES_KEY_BASE64 must decode into a 32 byte buffer");
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export type EncryptedPayload = {
  ciphertext: string;
  nonce: string;
};

export function encryptPayload<T>(payload: T): EncryptedPayload {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const json = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(json), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: Buffer.concat([encrypted, authTag]).toString("base64"),
    nonce: iv.toString("base64"),
  };
}

export function decryptPayload<T>(encrypted: EncryptedPayload): T {
  const iv = Buffer.from(encrypted.nonce, "base64");
  const buffer = Buffer.from(encrypted.ciphertext, "base64");
  const authTag = buffer.subarray(buffer.length - AUTH_TAG_LENGTH);
  const payload = buffer.subarray(0, buffer.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}
