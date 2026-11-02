import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a partial date (year with optional month/day) as "YYYY", "YYYY-MM", or "YYYY-MM-DD".
 * Returns `fallback` (default "-") when year is missing.
 */
export function formatPartialDate(
  year?: number | null,
  month?: number | null,
  day?: number | null,
  fallback: string = "-",
): string {
  if (!year) return fallback;
  let s = String(year);
  if (month) {
    s += `-${String(month).padStart(2, "0")}`;
    if (day) s += `-${String(day).padStart(2, "0")}`;
  }
  return s;
}

/**
 * Convert a partial date to a sortable numeric value (e.g. 20230105).
 * Missing month/day are treated as 0.
 */
export function dateSortValue(
  year?: number | null,
  month?: number | null,
  day?: number | null,
): number {
  return Number(
    `${year ?? 0}${String(month || 0).padStart(2, "0")}${String(day || 0).padStart(2, "0")}`
  );
}
