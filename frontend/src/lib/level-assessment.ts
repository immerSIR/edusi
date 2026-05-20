/**
 * Compute an initial current_level (1-5) from onboarding answers.
 *
 * Scoring: grade (0-4) + english (0-3) + tech (0-2) = 0-9 total
 * Mapped to levels 1-5.
 */
export function computeInitialLevel(
  schoolGrade: string,
  englishProficiency: string,
  techFamiliarity: string
): number {
  const gradeScores: Record<string, number> = {
    nursery_1: 0,
    nursery_2: 0,
    primary_1: 1,
    primary_2: 1,
    primary_3: 2,
    primary_4: 2,
    primary_5: 3,
    primary_6: 3,
    jss_1: 3,
    jss_2: 4,
    jss_3: 4,
    sss_1: 4,
    sss_2: 4,
    sss_3: 4,
    not_in_school: 0,
  };

  const proficiencyScores: Record<string, number> = {
    none: 0,
    basic: 1,
    intermediate: 2,
    fluent: 3,
  };

  const techScores: Record<string, number> = {
    none: 0,
    basic: 0,
    moderate: 1,
    comfortable: 2,
  };

  const score =
    (gradeScores[schoolGrade] ?? 0) +
    (proficiencyScores[englishProficiency] ?? 0) +
    (techScores[techFamiliarity] ?? 0);

  return Math.min(5, Math.max(1, Math.floor(score / 2) + 1));
}

/**
 * Suggest a Nigerian school grade from age using the 6-3-3-4 system.
 * Primary starts at age 6, JSS at 12, SSS at 15.
 */
export function suggestGrade(age: number): string {
  if (age < 4) return "nursery_1";
  if (age < 5) return "nursery_2";
  if (age < 6) return "primary_1";
  if (age >= 6 && age <= 11) return `primary_${age - 5}`;
  if (age >= 12 && age <= 14) return `jss_${age - 11}`;
  if (age >= 15) return `sss_${Math.min(age - 14, 3)}`;
  return "primary_1";
}
