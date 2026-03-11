import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

describe("catalog/image route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("should return the fallback image for private targets", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/catalog/image?url=http://127.0.0.1/image.png"),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    await expect(response.text()).resolves.toContain("Imagem indisponível");
  });

  it("should proxy remote image responses", async () => {
    fetchMock.mockResolvedValue(
      new Response("binary-image", {
        status: 200,
        headers: {
          "content-type": "image/png",
        },
      }),
    );
    
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/catalog/image?url=https://cdn.example.com/poster.png",
      ),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        cache: "force-cache",
        headers: expect.objectContaining({
          Accept: expect.stringContaining("image/"),
          "User-Agent": "Media-Catalog/1.0",
        }),
      }),
    );
    expect(response.headers.get("content-type")).toBe("image/png");
    await expect(response.text()).resolves.toBe("binary-image");
  });

  it("should fallback when the remote response is not an image", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>nope</html>", {
        status: 200,
        headers: {
          "content-type": "text/html",
        },
      }),
    );

    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/catalog/image?url=https://cdn.example.com/not-image",
      ),
    );

    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    await expect(response.text()).resolves.toContain("CATÁLOGO");
  });

  it("should fallback for invalid urls without calling fetch", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { GET } = await import("./route");

    const response = await GET(
      new NextRequest("http://localhost:3000/api/catalog/image?url=notaurl"),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "[catalog/image] URL de imagem invalida.",
      expect.any(Error),
    );
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
  });

  it("should fallback when the remote fetch fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new Error("network down"));

    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/catalog/image?url=https://cdn.example.com/poster.png",
      ),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "[catalog/image] Falha ao buscar imagem remota.",
      expect.any(Error),
    );
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
  });
});
