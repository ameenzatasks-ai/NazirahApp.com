/**
 * Juz → page range map for the New Madani 15-line Mus'haf (604 pages).
 * Each Juz spans a contiguous run of pages. Lengths are NOT all 20 —
 * the first and last few Juz vary slightly. This map is the canonical
 * source for the 4×5 grid renderer.
 *
 * Boundaries here follow the standard King Fahd Complex (KFC) Madani
 * Mus'haf. They are layout-agnostic at the *Juz* level (the canonical
 * Juz divisions are fixed regardless of edition), even though the
 * per-page-line content differs between Old and New Madani.
 */

export interface JuzInfo {
  juz: number;        // 1..30
  startPage: number;  // inclusive
  endPage: number;    // inclusive
  startSurah: number; // surah where this Juz begins
}

export const JUZ_MAP: JuzInfo[] = [
  { juz:  1, startPage:   1, endPage:  21, startSurah:  1 }, // Al-Fatiha → Al-Baqara 141
  { juz:  2, startPage:  22, endPage:  41, startSurah:  2 },
  { juz:  3, startPage:  42, endPage:  61, startSurah:  2 },
  { juz:  4, startPage:  62, endPage:  81, startSurah:  3 },
  { juz:  5, startPage:  82, endPage: 101, startSurah:  4 },
  { juz:  6, startPage: 102, endPage: 121, startSurah:  4 },
  { juz:  7, startPage: 122, endPage: 141, startSurah:  5 },
  { juz:  8, startPage: 142, endPage: 161, startSurah:  6 },
  { juz:  9, startPage: 162, endPage: 181, startSurah:  7 },
  { juz: 10, startPage: 182, endPage: 201, startSurah:  8 },
  { juz: 11, startPage: 202, endPage: 221, startSurah:  9 },
  { juz: 12, startPage: 222, endPage: 241, startSurah: 11 },
  { juz: 13, startPage: 242, endPage: 261, startSurah: 12 },
  { juz: 14, startPage: 262, endPage: 281, startSurah: 15 },
  { juz: 15, startPage: 282, endPage: 301, startSurah: 17 },
  { juz: 16, startPage: 302, endPage: 321, startSurah: 18 },
  { juz: 17, startPage: 322, endPage: 341, startSurah: 21 },
  { juz: 18, startPage: 342, endPage: 361, startSurah: 23 },
  { juz: 19, startPage: 362, endPage: 381, startSurah: 25 },
  { juz: 20, startPage: 382, endPage: 401, startSurah: 27 },
  { juz: 21, startPage: 402, endPage: 421, startSurah: 29 },
  { juz: 22, startPage: 422, endPage: 441, startSurah: 33 },
  { juz: 23, startPage: 442, endPage: 461, startSurah: 36 },
  { juz: 24, startPage: 462, endPage: 481, startSurah: 39 },
  { juz: 25, startPage: 482, endPage: 501, startSurah: 41 },
  { juz: 26, startPage: 502, endPage: 521, startSurah: 46 },
  { juz: 27, startPage: 522, endPage: 541, startSurah: 51 },
  { juz: 28, startPage: 542, endPage: 561, startSurah: 58 },
  { juz: 29, startPage: 562, endPage: 581, startSurah: 67 },
  { juz: 30, startPage: 582, endPage: 604, startSurah: 78 }, // Juz 'Amma — 23 pages
];

export function getJuz(juzNumber: number): JuzInfo | undefined {
  return JUZ_MAP.find(j => j.juz === juzNumber);
}

/** Returns the Juz that contains a given absolute page number. */
export function juzForPage(pageNumber: number): JuzInfo | undefined {
  return JUZ_MAP.find(j => pageNumber >= j.startPage && pageNumber <= j.endPage);
}

/**
 * Page memorization status (user-defined semantics).
 *   BLACK  — Listened once
 *   RED    — Read once (recited to the start)
 *   AMBER  — Practicing (~10 reads in, about to read to the start)
 *   GREEN  — Ready to memorize (cleared)
 *   GOLD   — Memorized in Sabaq
 *   YELLOW — Was Green, drifted >10 days → needs re-read
 * A page with no row in the DB is "Untouched" (rendered as empty).
 */
export type PageStatus =
  | 'BLACK'
  | 'RED'
  | 'AMBER'
  | 'YELLOW'
  | 'GREEN'
  | 'GOLD';

/** Backwards-compat alias so older imports keep working. */
export type QuarterStatus = PageStatus;
