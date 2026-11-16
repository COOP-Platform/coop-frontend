export const THIS_YEAR = new Date().getFullYear();

/** Past years to pick from, newest first. The backend refuses years before 2020. */
const PAST_YEARS = Math.min(4, THIS_YEAR - 2020);

/** The "Period" choices on My Contributions: this year and the four before it. */
export const YEAR_OPTIONS = Array.from({ length: PAST_YEARS + 1 }, (_, i) => {
  const value = THIS_YEAR - i;
  return {
    value: String(value),
    label: value === THIS_YEAR ? `This Year (${value})` : String(value),
  };
});
