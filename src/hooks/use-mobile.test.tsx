import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useIsMobile } from "./use-mobile";

type MatchMediaListener = () => void;

describe("use-mobile", () => {
  beforeEach(() => {
    const listeners = new Set<MatchMediaListener>();

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: window.innerWidth < 768,
        media: "(max-width: 767px)",
        onchange: null,
        addEventListener: (_event: string, listener: MatchMediaListener) => {
          listeners.add(listener);
        },
        removeEventListener: (_event: string, listener: MatchMediaListener) => {
          listeners.delete(listener);
        },
        dispatch() {
          listeners.forEach((listener) => listener());
        },
      })),
    });
  });

  it("should report desktop widths as non-mobile", () => {
    window.innerWidth = 1280;

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("should react to media query changes", () => {
    window.innerWidth = 1280;

    const { result } = renderHook(() => useIsMobile());
    const mql = window.matchMedia("(max-width: 767px)") as MediaQueryList & {
      dispatch: () => void;
    };

    act(() => {
      window.innerWidth = 480;
      mql.dispatch();
    });

    expect(result.current).toBe(true);
  });
});
