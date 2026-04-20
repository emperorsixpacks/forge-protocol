/**
 * ECIES encryption/decryption over secp256k1 using the buyer's EVM wallet keys.
 * - encrypt: takes a compressed public key (0x04... or 0x02/0x03...) or uncompressed
 * - decrypt: takes the private key hex (0x...)
 * - cipher: AES-256-GCM, key derived via ECDH + SHA-256
 * - wire format (base64): ephemPubKey(65) | iv(12) | authTag(16) | ciphertext
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { SigningKey, getBytes, hexlify } from "ethers";

function ecdh(privKey: Uint8Array, pubKey: Uint8Array): Buffer {
  const sk = new SigningKey(hexlify(privKey));
  const shared = sk.computeSharedSecret(hexlify(pubKey));
  // shared is 0x04 || x || y — hash x only (standard ECIES)
  return createHash("sha256").update(getBytes(shared).slice(1, 33)).digest();
}

export function encrypt(recipientPubKeyHex: string, plaintext: string): string {
  const ephemKey = new SigningKey(hexlify(randomBytes(32)));
  const ephemPub = getBytes(ephemKey.publicKey); // uncompressed, 65 bytes
  const recipientPub = getBytes(
    recipientPubKeyHex.startsWith("0x") ? recipientPubKeyHex : `0x${recipientPubKeyHex}`
  );

  const aesKey = ecdh(getBytes(ephemKey.privateKey), recipientPub);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload = Buffer.concat([ephemPub, iv, tag, ct]);
  return payload.toString("base64");
}

export function decrypt(privateKeyHex: string, ciphertext: string): string {
  const payload = Buffer.from(ciphertext, "base64");
  const ephemPub = payload.subarray(0, 65);
  const iv = payload.subarray(65, 77);
  const tag = payload.subarray(77, 93);
  const ct = payload.subarray(93);

  const privBytes = getBytes(
    privateKeyHex.startsWith("0x") ? privateKeyHex : `0x${privateKeyHex}`
  );
  const aesKey = ecdh(privBytes, ephemPub);
  const decipher = createDecipheriv("aes-256-gcm", aesKey, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ct) + decipher.final("utf8");
}
