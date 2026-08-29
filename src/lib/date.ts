/**
 * Dates, in one place.
 *
 * Two representations and no third. **ISO `YYYY-MM-DD` is the value** — it is
 * what `Facts` holds, what the matchers compare, what `<input type="date">`
 * reads and writes, and what the extraction schema demands from the model.
 * **`DD/MM/YYYY` is the picture** — it is what a citizen sees, everywhere,
 * because that is how a date is printed on every Indian document this product
 * compares against.
 *
 * The reason this file exists rather than a `toLocaleDateString` at each call
 * site: `new Date("12/04/2001")` is parsed as 12 April in a browser set to
 * en-IN and as 4 December in one set to en-US, and neither tells you which it
 * chose. A date of birth read off a passbook and silently swapped is a
 * rejected claim. So nothing here goes near `Date` parsing — the format is
 * matched explicitly, day first, and a date that is not a real calendar day is
 * `null` rather than a guess.
 */

/** Canonical: the only shape stored, compared or sent. */
const ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
/** Day-first, the way Indian documents print it. `12/04/2001` is 12 April. */
const DAY_FIRST = /^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{4})$/;

const pad = (n: number) => String(n).padStart(2, "0");

/** A real day on the calendar — 31 April and 29 February 2001 are not. */
function real(y: number, m: number, d: number): boolean {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d <= days[m - 1];
}

/**
 * Any date we might be handed → the canonical ISO value, or `null`.
 *
 * Accepts ISO and day-first (`DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY`).
 * Ambiguity is resolved by position, never by locale: `01/02/2000` is the
 * first of February, on every machine, forever.
 */
export function parseDate(raw: string | null | undefined): string | null {
  const s = raw?.trim();
  if (!s) return null;

  const iso = s.match(ISO);
  if (iso) {
    const [, y, m, d] = iso.map(Number) as unknown as number[];
    return real(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : null;
  }

  const dmy = s.match(DAY_FIRST);
  if (dmy) {
    const [, d, m, y] = dmy.map(Number) as unknown as number[];
    return real(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : null;
  }

  return null;
}

/**
 * The canonical value → what the citizen reads. One format, every screen.
 *
 * Anything unparseable is returned unchanged: this is display code, and a
 * value we cannot format is still a value the reader is entitled to see.
 */
export function formatDate(raw: string | null | undefined): string {
  const iso = parseDate(raw);
  if (!iso) return raw?.trim() ?? "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * The value for an `<input type="date">`, which speaks ISO and only ISO. An
 * unparseable value becomes empty rather than making the control reject it.
 */
export function formatDateForInput(raw: string | null | undefined): string {
  return parseDate(raw) ?? "";
}
