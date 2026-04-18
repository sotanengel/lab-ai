import { createHash } from "node:crypto";

export function sha256Hex(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

export function byteLength(input: string): number {
  return Buffer.byteLength(input, "utf8");
}
