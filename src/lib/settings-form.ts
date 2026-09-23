// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import type { SalaryConfig, SalaryType } from "./salary";
import { mondayOfWeek, toDateKey } from "./salary/week-cycle";
import type { Messages } from "../i18n/types";

export type SettingsFormT = (
  key: keyof Messages,
  params?: Record<string, string | number>,
) => string;

export function createSalaryTypeOptions(t: SettingsFormT) {
  return [
    { value: "monthly" as SalaryType, label: t("salaryMode.monthly") },
    { value: "daily" as SalaryType, label: t("salaryMode.daily") },
    { value: "hourly" as SalaryType, label: t("salaryMode.hourly") },
  ];
}

export type WeekdayOption = {
  value: number;
  label: string;
};

export function createWeekdayOptions(t: SettingsFormT): WeekdayOption[] {
  return [
    { value: 1, label: t("workdays.mon") },
    { value: 2, label: t("workdays.tue") },
    { value: 3, label: t("workdays.wed") },
    { value: 4, label: t("workdays.thu") },
    { value: 5, label: t("workdays.fri") },
    { value: 6, label: t("workdays.sat") },
    { value: 0, label: t("workdays.sun") },
  ];
}

// A day the small week already works cannot also be an extra day of the big week: such a
// combination describes two identical weeks, which is the thing this toggle exists to avoid.
export function createBigWeekExtraDayOptions(
  t: SettingsFormT,
  workdays: readonly number[],
) {
  return createWeekdayOptions(t).filter((option) => !workdays.includes(option.value));
}

// The two weeks have to differ, so an extra day the small week already works is dropped; if that
// leaves nothing, the first day the small week leaves free takes its place. A small week that
// covers all seven days has nothing to offer, and validation is what reports that.
export const reconcileBigWeekExtraDays = (
  availableDays: readonly number[],
  extraDays: readonly number[],
) => {
  const kept = extraDays.filter((day) => availableDays.includes(day));

  return kept.length > 0 ? kept : availableDays.slice(0, 1);
};

// Turning the toggle on makes the week the user is in a big week, so the alternation is aligned by
// default; choosing the other week moves the anchor one week forward instead.
export const alignBigWeekAnchor = (now: Date, thisWeekIsBig: boolean) => {
  const monday = mondayOfWeek(now);
  monday.setDate(monday.getDate() + (thisWeekIsBig ? 0 : 7));

  return toDateKey(monday);
};

export function createGetSalaryAmountLabel(t: SettingsFormT) {
  return (salaryType: SalaryType) => {
    if (salaryType === "daily") return t("salaryAmount.dailySalary");
    if (salaryType === "hourly") return t("salaryAmount.hourlyRate");
    return t("salaryAmount.monthlySalary");
  };
}

export const toggleWorkdayValue = (workdays: SalaryConfig["workdays"], day: number) =>
  (workdays.includes(day)
    ? workdays.filter((item) => item !== day)
    : [...workdays, day]
  ).sort((a, b) => a - b);

export const readInputText = (event: Event) => (event.target as HTMLInputElement).value;
