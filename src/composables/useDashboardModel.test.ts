// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import { describe, expect, it } from "vitest";
import { ref, type Ref } from "vue";
import { useDashboardModel } from "./useDashboardModel";
import { createT } from "./useI18n";
import { defaultSalaryConfig, emptySnapshot, type SalarySnapshot } from "../lib/salary";

const snapshotOf = (overrides: Partial<SalarySnapshot>): Ref<SalarySnapshot> =>
  ref({ ...emptySnapshot, ...overrides });

const buildModel = (snapshot: Ref<SalarySnapshot>, config = defaultSalaryConfig) =>
  useDashboardModel(ref(config), snapshot, createT("zh-CN"), ref("zh-CN"));

describe("useDashboardModel effective hourly rate", () => {
  it("includes enabled overtime pay in today's expected earnings", () => {
    const model = buildModel(snapshotOf({ dailySalary: 375, status: "working" }), {
      ...defaultSalaryConfig,
      overtimeEnabled: true,
      overtimeHours: 2,
      overtimePay: 100,
    });
    expect(model.dailyEarnText.value).toBe("475.00");
  });
  it("formats the live hourly rate to two decimals", () => {
    const model = buildModel(
      snapshotOf({ effectiveHourlyRate: 46.875, hourlyRate: 46.875, status: "working" }),
    );

    expect(model.effectiveHourlyRateText.value).toBe("46.88");
  });

  it("withholds the rate while the config needs fixing", () => {
    const model = buildModel(
      snapshotOf({ effectiveHourlyRate: 0, status: "invalid-config" }),
      { ...defaultSalaryConfig, salaryType: "daily", dailySalary: 0 },
    );

    expect(model.effectiveHourlyRateText.value).toBe("");
  });
});
