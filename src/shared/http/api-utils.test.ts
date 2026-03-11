import { describe, expect, it } from "vitest";
import {
  getStringParam,
  parseBooleanParam,
  parseCsvParam,
  parseIntParam,
  parseOptionalIntParam,
} from "./api-utils";

describe("api-utils", () => {
  it("should clamp integer params to the configured range", () => {
    expect(parseIntParam("999", 1, 1, 50)).toBe(50);
    expect(parseIntParam("-5", 1, 1, 50)).toBe(1);
    expect(parseIntParam(null, 12, 1, 50)).toBe(12);
  });

  it("should normalize optional string params", () => {
    expect(getStringParam("  action  ")).toBe("action");
    expect(getStringParam("   ")).toBeUndefined();
  });

  it("should parse optional integers only when valid", () => {
    expect(parseOptionalIntParam("15", 1, 30)).toBe(15);
    expect(parseOptionalIntParam("999", 1, 30)).toBe(30);
    expect(parseOptionalIntParam("abc", 1, 30)).toBeUndefined();
  });

  it("should parse boolean params from common string values", () => {
    expect(parseBooleanParam("true")).toBe(true);
    expect(parseBooleanParam("YES")).toBe(true);
    expect(parseBooleanParam("0")).toBe(false);
    expect(parseBooleanParam("talvez")).toBeUndefined();
  });

  it("should parse csv params without duplicates or all values", () => {
    expect(parseCsvParam("acao, drama, all, acao, thriller", 4)).toEqual([
      "acao",
      "drama",
      "thriller",
    ]);
  });
});
