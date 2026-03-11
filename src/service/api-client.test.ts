import { beforeEach, describe, expect, it, vi } from "vitest";
import { cachedGetJson } from "./api-client";

const { cacheGetMock, cacheSetMock, axiosGetMock } = vi.hoisted(() => ({
  cacheGetMock: vi.fn(),
  cacheSetMock: vi.fn(),
  axiosGetMock: vi.fn(),
}));

vi.mock("@services/api-cache", () => ({
  cacheGet: cacheGetMock,
  cacheSet: cacheSetMock,
}));

vi.mock("@infrastructure/http/axios-client", () => ({
  axiosClient: {
    get: axiosGetMock,
  },
}));

type DeferredAxiosResponse<TData> = {
  data: TData;
};

describe("api-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return cached responses without hitting axios", async () => {
    cacheGetMock.mockReturnValue({ cached: true });

    await expect(cachedGetJson("/api/test", 60_000)).resolves.toEqual({
      cached: true,
    });
    expect(axiosGetMock).not.toHaveBeenCalled();
  });

  it("should fetch, cache and return fresh responses", async () => {
    cacheGetMock.mockReturnValue(null);
    axiosGetMock.mockResolvedValue({
      data: { fresh: true },
    });

    await expect(cachedGetJson("/api/test", 60_000)).resolves.toEqual({
      fresh: true,
    });
    expect(cacheSetMock).toHaveBeenCalledWith("/api/test", { fresh: true }, 60_000);
  });

  it("should dedupe in-flight requests for the same url", async () => {
    cacheGetMock.mockReturnValue(null);
    let resolveRequest:
      | ((value: DeferredAxiosResponse<{ value: number }>) => void)
      | undefined;
    axiosGetMock.mockImplementation(
      () =>
        new Promise<DeferredAxiosResponse<{ value: number }>>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const first = cachedGetJson<{ value: number }>("/api/test", 60_000);
    const second = cachedGetJson<{ value: number }>("/api/test", 60_000);

    if (!resolveRequest) {
      throw new Error("Expected request resolver to be defined.");
    }
    resolveRequest({ data: { value: 1 } });

    await expect(first).resolves.toEqual({ value: 1 });
    await expect(second).resolves.toEqual({ value: 1 });
    expect(axiosGetMock).toHaveBeenCalledTimes(1);
  });

  it("should reject immediately when the abort signal is already aborted", async () => {
    cacheGetMock.mockReturnValue(null);
    axiosGetMock.mockResolvedValue({
      data: { value: 1 },
    });
    const controller = new AbortController();
    controller.abort();

    await expect(
      cachedGetJson("/api/aborted-before-start", 60_000, controller.signal),
    ).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("should abort a waiting caller without cancelling the shared request", async () => {
    cacheGetMock.mockReturnValue(null);
    let resolveRequest:
      | ((value: DeferredAxiosResponse<{ value: number }>) => void)
      | undefined;
    axiosGetMock.mockImplementation(
      () =>
        new Promise<DeferredAxiosResponse<{ value: number }>>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const controller = new AbortController();
    const sharedRequest = cachedGetJson<{ value: number }>("/api/in-flight", 60_000);
    const abortedRequest = cachedGetJson<{ value: number }>(
      "/api/in-flight",
      60_000,
      controller.signal,
    );

    controller.abort();
    if (!resolveRequest) {
      throw new Error("Expected request resolver to be defined.");
    }
    resolveRequest({ data: { value: 2 } });

    await expect(sharedRequest).resolves.toEqual({ value: 2 });
    await expect(abortedRequest).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(axiosGetMock).toHaveBeenCalledTimes(1);
  });
});
