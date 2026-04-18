import { describe, expect, it } from "vitest";
import { byteLength, sha256Hex } from "../services/hash-service.js";

describe("sha256Hex", () => {
  it("returns the canonical sha-256 for an empty string", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("is deterministic for the same input", () => {
    const a = sha256Hex("hello");
    const b = sha256Hex("hello");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes with a single byte difference", () => {
    const a = sha256Hex("hello");
    const b = sha256Hex("helloo");
    expect(a).not.toBe(b);
  });

  it("accepts a Uint8Array in addition to a string", () => {
    const hex = sha256Hex(new Uint8Array([0, 1, 2, 3]));
    expect(hex).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("byteLength", () => {
  it("returns 0 for the empty string", () => {
    expect(byteLength("")).toBe(0);
  });

  it("counts utf-8 bytes for multibyte text", () => {
    expect(byteLength("あ")).toBe(3);
    expect(byteLength("ascii")).toBe(5);
  });
});
