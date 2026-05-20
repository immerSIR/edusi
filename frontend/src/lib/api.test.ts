import { afterEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "./api";

describe("apiFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prefixes paths with the backend URL and merges JSON headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ status: "ok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiFetch<{ status: string }>("/api/health", {
        method: "POST",
        headers: { Authorization: "Bearer token" },
      }),
    ).resolves.toEqual({ status: "ok" });

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/health", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
    });
  });

  it("throws API detail messages for non-2xx responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Bad Request",
        json: vi.fn().mockResolvedValue({ detail: "Invalid code" }),
      }),
    );

    await expect(apiFetch("/api/auth/whatsapp/verify")).rejects.toThrow("Invalid code");
  });

  it("falls back to the HTTP status text when an error body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Service Unavailable",
        json: vi.fn().mockRejectedValue(new Error("not json")),
      }),
    );

    await expect(apiFetch("/api/health")).rejects.toThrow("Service Unavailable");
  });
});
