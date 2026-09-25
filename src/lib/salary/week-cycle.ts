// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import type { SalaryConfig } from "./config";

const msPerWeek = 7 * 24 * 60 * 60 * 1000;
const dateKeyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export const toDateKey = (date: Date) => {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
};

export const parseDateKey = (key: string) => {
  const match = dateKeyPattern.exec(key);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setHours(0, 0, 0, 0);

  // A key that rolled over (2026-02-31) must not pass as a valid date.
  return toDateKey(date) === key ? date : null;
};

// Sunday belongs to the week that started six days earlier, so a week always begins on Monday.
// Deriving the anchor week this way is what makes the phase survive month, year and DST edges.
export const mondayOfWeek = (date: Date) => {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  return monday;
};

// Big weeks alternate with small ones, so the phase is the parity of the whole weeks between the
// date and a week the user has declared big. ISO week parity would only fit users whose calendar
// happens to line up with it; an anchor picked once fits everyone.
export const isBigWeek = (date: Date, config: SalaryConfig) => {
  const anchor =
    typeof config.bigWeekAnchor === "string" ? parseDateKey(config.bigWeekAnchor) : null;
  if (!anchor) return false;

  // Math.round absorbs the hour a daylight-saving change adds to or removes from a week.
  const weeks = Math.round(
    (mondayOfWeek(date).getTime() - mondayOfWeek(anchor).getTime()) / msPerWeek,
  );

  return ((weeks % 2) + 2) % 2 === 0;
};
