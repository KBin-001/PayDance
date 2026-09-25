// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import { describe, expect, it } from "vitest";
import {
  alignBigWeekAnchor,
  createBigWeekExtraDayOptions,
  reconcileBigWeekExtraDays,
  createGetSalaryAmountLabel,
  createSalaryTypeOptions,
  createWeekdayOptions,
  toggleWorkdayValue,
} from "./settings-form";

const t = (key: string) => {
  const map: Record<string, string> = {
    "salaryMode.monthly": "月薪",
    "salaryMode.daily": "日薪",
    "salaryMode.hourly": "时薪",
    "salaryAmount.monthlySalary": "月薪",
    "salaryAmount.dailySalary": "日薪",
    "salaryAmount.hourlyRate": "时薪",
    "workdays.mon": "一",
    "workdays.tue": "二",
    "workdays.wed": "三",
    "workdays.thu": "四",
    "workdays.fri": "五",
    "workdays.sat": "六",
    "workdays.sun": "日",
  };
  return map[key] ?? key;
};

describe("settings form helpers", () => {
  it("shares salary mode labels between settings and onboarding", () => {
    expect(createSalaryTypeOptions(t).map((option) => option.label)).toEqual([
      "月薪",
      "日薪",
      "时薪",
    ]);
    expect(createGetSalaryAmountLabel(t)("monthly")).toBe("月薪");
    expect(createGetSalaryAmountLabel(t)("daily")).toBe("日薪");
    expect(createGetSalaryAmountLabel(t)("hourly")).toBe("时薪");
  });

  it("shares the same weekday order and toggle semantics", () => {
    expect(createWeekdayOptions(t).map((option) => option.value)).toEqual([
      1, 2, 3, 4, 5, 6, 0,
    ]);
    expect(toggleWorkdayValue([1, 3, 5], 2)).toEqual([1, 2, 3, 5]);
    expect(toggleWorkdayValue([1, 2, 3, 5], 2)).toEqual([1, 3, 5]);
  });

  it("offers only the days the small week leaves free as big-week extra days", () => {
    const options = createBigWeekExtraDayOptions(t, [1, 2, 3, 4, 5]);

    expect(options.offered.map((option) => option.value)).toEqual([6, 0]);
    expect(options.offered.map((option) => option.label)).toEqual(["六", "日"]);
    expect(options.free).toEqual([6, 0]);
  });

  it("aligns the big-week anchor to the chosen week", () => {
    // 2026-05-13 is a Wednesday, so the week it belongs to started on 2026-05-11.
    const wednesday = new Date("2026-05-13T09:00:00");

    expect(alignBigWeekAnchor(wednesday, true)).toBe("2026-05-11");
    expect(alignBigWeekAnchor(wednesday, false)).toBe("2026-05-18");
  });

  it("keeps the extra days that the small week still leaves free", () => {
    expect(reconcileBigWeekExtraDays([6, 0], [6])).toEqual([6]);
    expect(reconcileBigWeekExtraDays([0], [6])).toEqual([0]);
  });

  it("falls back to the first free day when the chosen extra days are unusable", () => {
    expect(reconcileBigWeekExtraDays([6, 0], [1, 2])).toEqual([6]);
    expect(reconcileBigWeekExtraDays([], [6])).toEqual([]);
  });

  it("never offers a day the small week already works", () => {
    const options = createBigWeekExtraDayOptions(t, [1, 2, 3, 4, 5, 6], []);

    expect(options.offered.map((option) => option.value)).toEqual([0]);
    expect(options.free).toEqual([0]);
  });

  it("keeps a selected extra day on offer so it can be cleared", () => {
    const options = createBigWeekExtraDayOptions(t, [1, 2, 3, 4, 5], [1]);

    expect(options.offered.map((option) => option.value)).toEqual([1, 6, 0]);
    expect(options.free).toEqual([6, 0]);
  });

  it("aligns the anchor on a Sunday to the Monday that started that week", () => {
    const sunday = new Date("2026-05-17T09:00:00");

    expect(alignBigWeekAnchor(sunday, true)).toBe("2026-05-11");
    expect(alignBigWeekAnchor(sunday, false)).toBe("2026-05-18");
  });
});
