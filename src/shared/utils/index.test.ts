import { describe, expect, it } from "vitest";
import {
  cleanTitleForSearch,
  cn,
  formatNumber,
  placeholderImage,
  sanitizeDisplayTitle,
} from "./index";

describe("shared utils", () => {
  it("should format numbers for pt-BR", () => {
    expect(formatNumber(1234567)).toBe("1.234.567");
  });

  it("should sanitize display titles", () => {
    expect(sanitizeDisplayTitle("Acao_Aventura__")).toBe("Acao Aventura");
  });

  it("should clean noisy titles for search", () => {
    expect(cleanTitleForSearch("2025 - Movie [HDR] (2025) DUBLADO S01E01")).toBe(
      "Movie",
    );
  });

  it("should merge class names with tailwind precedence", () => {
    expect(cn("px-2 text-white", false && "hidden", "px-4")).toBe("text-white px-4");
  });

  it("should generate inline placeholder images", () => {
    expect(placeholderImage("poster")).toContain("data:image/svg+xml,");
    expect(decodeURIComponent(placeholderImage("poster"))).toContain("Sem capa");
    expect(decodeURIComponent(placeholderImage("backdrop"))).toContain("CARREGANDO MÍDIA");
  });
});
