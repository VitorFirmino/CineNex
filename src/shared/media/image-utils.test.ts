import { describe, expect, it } from "vitest";

import { normalizeImageSrc } from "./image-utils";

describe("image-utils", () => {
  it("should keep local and inline sources untouched", () => {
    expect(normalizeImageSrc("/poster.png")).toBe("/poster.png");
    expect(normalizeImageSrc("data:image/png;base64,aaa")).toBe("data:image/png;base64,aaa");
  });

  it("should proxy absolute urls", () => {
    expect(normalizeImageSrc("https://cdn.example.com/poster.png")).toBe(
      "/api/catalog/image?url=https%3A%2F%2Fcdn.example.com%2Fposter.png",
    );
    expect(normalizeImageSrc("http://cdn.example.com/poster.png")).toBe(
      "/api/catalog/image?url=http%3A%2F%2Fcdn.example.com%2Fposter.png",
    );
    expect(normalizeImageSrc("//cdn.example.com/poster.png")).toBe(
      "/api/catalog/image?url=https%3A%2F%2Fcdn.example.com%2Fposter.png",
    );
  });

  it("should keep proxied urls and trim surrounding spaces", () => {
    expect(normalizeImageSrc("  /api/catalog/image?url=https%3A%2F%2Fcdn.example.com%2Fposter.png  ")).toBe(
      "/api/catalog/image?url=https%3A%2F%2Fcdn.example.com%2Fposter.png",
    );
    expect(normalizeImageSrc("  /poster.png  ")).toBe("/poster.png");
  });

  it("should reject unsupported values", () => {
    expect(normalizeImageSrc("poster.png")).toBeNull();
    expect(normalizeImageSrc("")).toBeNull();
    expect(normalizeImageSrc("javascript:alert(1)")).toBeNull();
  });
});
