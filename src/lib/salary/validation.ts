// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import {
  unalignedBigWeekAnchor,
  type SalaryConfig,
  type SalaryConfigIssue,
  type SalaryType,
} from "./config";
import { parseDateKey } from "./week-cycle";
import {
  normalizeBreakEnd,
  normalizeTimeInsideWorkWindow,
  normalizeWorkEnd,
  parseTimeToMinutes,
} from "./time";
import type { Messages } from "../../i18n/types";

const salaryTypes: SalaryType[] = ["monthly", "daily", "hourly"];

export const maxWorkDaysPerMonth = 31;

const hasPositiveNumber = (value: number) => Number.isFinite(value) && value > 0;

const isValidWorkday = (day: number) => Number.isInteger(day) && day >= 0 && day <= 6;

const isMissingDaySet = (value: unknown) => !Array.isArray(value) || value.length <= 0;

const isDayOfWeekSet = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every(isValidWorkday);

export function isOvernightWorkConfig(config: SalaryConfig) {
  const start = parseTimeToMinutes(config.startTime);
  const end = parseTimeToMinutes(config.endTime);

  return Number.isFinite(start) && Number.isFinite(end) && end < start;
}

export type ValidateT = (
  key: keyof Messages,
  params?: Record<string, string | number>,
) => string;

export function validateSalaryConfig(
  config: SalaryConfig,
  t: ValidateT,
): SalaryConfigIssue[] {
  const issues: SalaryConfigIssue[] = [];
  const start = parseTimeToMinutes(config.startTime);
  const end = parseTimeToMinutes(config.endTime);
  const salaryType = config.salaryType ?? "monthly";

  if (!salaryTypes.includes(salaryType)) {
    issues.push({ field: "salaryType", message: t("validation.salaryTypeError") });
  }

  if (salaryType === "monthly" && !hasPositiveNumber(config.monthlySalary)) {
    issues.push({ field: "monthlySalary", message: t("validation.monthlyPositive") });
  }

  if (salaryType === "daily" && !hasPositiveNumber(config.dailySalary)) {
    issues.push({ field: "dailySalary", message: t("validation.dailyPositive") });
  }

  if (salaryType === "hourly" && !hasPositiveNumber(config.hourlyRate)) {
    issues.push({ field: "hourlyRate", message: t("validation.hourlyPositive") });
  }

  if (config.overtimeEnabled) {
    if (!Number.isFinite(config.overtimeHours) || config.overtimeHours < 0) {
      issues.push({ field: "overtimeHours", message: t("validation.overtimeHours") });
    }
    if (!Number.isFinite(config.overtimePay) || config.overtimePay < 0) {
      issues.push({ field: "overtimePay", message: t("validation.overtimePay") });
    }
    if (config.overtimePay > 0 && config.overtimeHours === 0) {
      issues.push({
        field: "overtimeHours",
        message: t("validation.overtimeHoursForPay"),
      });
    }
  }

  if (salaryType === "monthly" && !hasPositiveNumber(config.workDaysPerMonth)) {
    issues.push({
      field: "workDaysPerMonth",
      message: t("validation.workDaysPositive"),
    });
  } else if (salaryType === "monthly" && config.workDaysPerMonth > maxWorkDaysPerMonth) {
    issues.push({
      field: "workDaysPerMonth",
      message: t("validation.workDaysRange"),
    });
  }

  if (isMissingDaySet(config.workdays)) {
    issues.push({ field: "workdays", message: t("validation.workdaysMinOne") });
  } else if (!isDayOfWeekSet(config.workdays)) {
    issues.push({ field: "workdays", message: t("validation.workdaysError") });
  }

  // The big-week fields only mean anything while the toggle is on, so a config saved before them,
  // or one with the toggle off, never turns into "needs setup" because of them.
  if (config.bigWeekEnabled) {
    if (isMissingDaySet(config.bigWeekExtraDays)) {
      issues.push({
        field: "bigWeekExtraDays",
        message: t("validation.bigWeekExtraDaysEmpty"),
      });
    } else if (!isDayOfWeekSet(config.bigWeekExtraDays)) {
      issues.push({
        field: "bigWeekExtraDays",
        message: t("validation.bigWeekExtraDaysError"),
      });
    } else if (
      Array.isArray(config.workdays) &&
      config.bigWeekExtraDays.some((day) => config.workdays.includes(day))
    ) {
      // The two weeks would be identical, which is the thing the toggle exists to express.
      issues.push({
        field: "bigWeekExtraDays",
        message: t("validation.bigWeekExtraDaysOverlap"),
      });
    }

    // The anchor is still unaligned only until the toggle is switched on, which is the one moment
    // that fills it in. Persisting reads accept that state; here it means the phase is undefined.
    const anchor = config.bigWeekAnchor;
    if (
      typeof anchor !== "string" ||
      anchor === unalignedBigWeekAnchor ||
      !parseDateKey(anchor)
    ) {
      issues.push({
        field: "bigWeekAnchor",
        message: t("validation.bigWeekAnchorError"),
      });
    }
  }

  if (!Number.isFinite(start)) {
    issues.push({ field: "startTime", message: t("validation.startTimeError") });
  }

  if (!Number.isFinite(end)) {
    issues.push({ field: "endTime", message: t("validation.endTimeError") });
  }

  if (Number.isFinite(start) && Number.isFinite(end) && start === end) {
    issues.push({ field: "workTime", message: t("validation.timeSameError") });
  }

  if (!config.enableLunchBreak) {
    return issues;
  }

  const lunchStart = parseTimeToMinutes(config.lunchStart);
  const lunchEnd = parseTimeToMinutes(config.lunchEnd);

  if (!Number.isFinite(lunchStart)) {
    issues.push({ field: "lunchStart", message: t("validation.lunchStartError") });
  }

  if (!Number.isFinite(lunchEnd)) {
    issues.push({ field: "lunchEnd", message: t("validation.lunchEndError") });
  }

  if (
    Number.isFinite(lunchStart) &&
    Number.isFinite(lunchEnd) &&
    lunchStart === lunchEnd
  ) {
    issues.push({ field: "workTime", message: t("validation.lunchSameError") });
    return issues;
  }

  if (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start !== end &&
    Number.isFinite(lunchStart) &&
    Number.isFinite(lunchEnd)
  ) {
    const workEnd = normalizeWorkEnd(start, end);
    const normalizedLunchStart = normalizeTimeInsideWorkWindow(lunchStart, start);
    const normalizedLunchEnd = normalizeBreakEnd(normalizedLunchStart, lunchEnd);

    if (!(
      start < normalizedLunchStart &&
      normalizedLunchStart < normalizedLunchEnd &&
      normalizedLunchEnd < workEnd
    )) {
      issues.push({
        field: "workTime",
        message: t(
          end < start ? "validation.nightLunchOutside" : "validation.lunchOutside",
        ),
      });
    }
  }

  return issues;
}
