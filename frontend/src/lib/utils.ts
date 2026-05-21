/** Compute age in years from a date of birth string (YYYY-MM-DD). */
export function computeAge(dateOfBirth: string): number {
  const today = new Date();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) {
    return 0;
  }

  const [, year, month, day] = match.map(Number);
  const dob = new Date(year, month - 1, day);
  const isValidDate =
    dob.getFullYear() === year &&
    dob.getMonth() === month - 1 &&
    dob.getDate() === day;

  if (!isValidDate || dob > today) {
    return 0;
  }

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}
