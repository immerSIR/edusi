import { afterEach, describe, expect, it, vi } from "vitest";

import { computeAge } from "./utils";

describe("computeAge", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the full number of elapsed years after the birthday", () => {
    vi.setSystemTime(new Date("2026-05-20T12:00:00Z"));
    expect(computeAge("2018-04-15")).toBe(8);
  });

  it("does not increment the age before this year's birthday", () => {
    vi.setSystemTime(new Date("2026-05-20T12:00:00Z"));
    expect(computeAge("2018-06-01")).toBe(7);
  });

  it("increments the age on the birthday", () => {
    vi.setSystemTime(new Date("2026-05-20T12:00:00Z"));
    expect(computeAge("2018-05-20")).toBe(8);
  });
});
