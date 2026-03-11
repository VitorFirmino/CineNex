import { cacheGet, cacheSet } from "@services/api-cache";
import { axiosClient } from "@infrastructure/http/axios-client";

const inFlight = new Map<string, Promise<unknown>>();

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("The operation was aborted.", "AbortError");
  }
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

function withAbortSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(createAbortError());
    signal.addEventListener("abort", onAbort, { once: true });

    const settlePromise = async () => {
      try {
        resolve(await promise);
      } catch (error) {
        reject(error);
      } finally {
        signal.removeEventListener("abort", onAbort);
      }
    };

    void settlePromise();
  });
}

export async function cachedGetJson<T>(
  url: string,
  ttlMs: number,
  signal?: AbortSignal,
): Promise<T> {
  const cached = cacheGet<T>(url);
  if (cached !== null) {
    return cached;
  }

  const existing = inFlight.get(url) as Promise<T> | undefined;
  if (existing) {
    return withAbortSignal(existing, signal);
  }

  const requestPromise = (async () => {
    const { data } = await axiosClient.get<T>(url);
    cacheSet(url, data, ttlMs);
    return data;
  })();

  inFlight.set(url, requestPromise);
  requestPromise.finally(() => {
    inFlight.delete(url);
  });

  return withAbortSignal(requestPromise, signal);
}
