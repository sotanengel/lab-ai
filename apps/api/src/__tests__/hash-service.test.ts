import { describe, expect, it } from "vitest";
import { sha256Hex } from "../services/hash-service.js";

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
});
