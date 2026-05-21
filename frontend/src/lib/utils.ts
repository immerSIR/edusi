/** Compute age in years from a date of birth string (YYYY-MM-DD). */
export function computeAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);

  if (Number.isNaN(dob.getTime())) {
    return 0;
  }

  const today = new Date();

  if (dob > today) {
    return 0;
  }

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}
