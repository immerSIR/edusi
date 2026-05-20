import { afterEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: supabaseMocks.getSession,
    },
  },
}));

import { apiFetch, getBackendAuthHeaders } from "./api";

describe("apiFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    supabaseMocks.getSession.mockReset();
  });

  it("builds an authorization header from the Supabase session", async () => {
    supabaseMocks.getSession.mockResolvedValue({
      data: { session: { access_token: "session-token" } },
      error: null,
    });

    await expect(getBackendAuthHeaders()).resolves.toEqual({
      Authorization: "Bearer session-token",
    });
  });

  it("returns no authorization header when there is no Supabase session", async () => {
    supabaseMocks.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    await expect(getBackendAuthHeaders()).resolves.toEqual({});
  });

  it("adds the Supabase bearer token for authenticated backend requests", async () => {
    supabaseMocks.getSession.mockResolvedValue({
      data: { session: { access_token: "session-token" } },
      error: null,
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ status: "ok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiFetch<{ status: string }>("/api/content/generate-course", {
        method: "POST",
        authenticated: true,
      }),
    ).resolves.toEqual({ status: "ok" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/content/generate-course",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer session-token",
        },
      },
    );
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
