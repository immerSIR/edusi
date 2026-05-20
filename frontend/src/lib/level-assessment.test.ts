import { describe, expect, it } from "vitest";

import { computeInitialLevel, suggestGrade } from "./level-assessment";

describe("computeInitialLevel", () => {
  it("maps the lowest onboarding answers to level 1", () => {
    expect(computeInitialLevel("nursery_1", "none", "none")).toBe(1);
  });

  it("combines grade, English proficiency, and tech familiarity", () => {
    expect(computeInitialLevel("primary_4", "intermediate", "moderate")).toBe(3);
    expect(computeInitialLevel("jss_2", "fluent", "comfortable")).toBe(5);
  });

  it("falls back to zero score for unknown answers", () => {
    expect(computeInitialLevel("unknown", "unknown", "unknown")).toBe(1);
  });

  it("caps the computed level at 5", () => {
    expect(computeInitialLevel("sss_3", "fluent", "comfortable")).toBe(5);
  });
});

describe("suggestGrade", () => {
  it.each([
    [3, "nursery_1"],
    [4, "nursery_2"],
    [5, "primary_1"],
    [6, "primary_1"],
    [11, "primary_6"],
    [12, "jss_1"],
    [14, "jss_3"],
    [15, "sss_1"],
    [20, "sss_3"],
  ])("suggests %s-year-old children should start at %s", (age, grade) => {
    expect(suggestGrade(age)).toBe(grade);
  });
});
