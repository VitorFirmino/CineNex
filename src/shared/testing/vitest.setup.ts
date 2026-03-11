import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();

  if (typeof window === "undefined") return;

  window.localStorage.clear();
  window.sessionStorage.clear();
});
