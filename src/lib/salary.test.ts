// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import { describe, expect, it } from "vitest";
import {
  calculateSalarySnapshot,
  createWorkSpans,
  defaultSalaryConfig,
  validateSalaryConfig,
  type SalaryConfig,
} from "./salary";

const vt = (key: string) => {
  const map: Record<string, string> = {
    "validation.salaryTypeError": "薪资模式错误",
    "validation.monthlyPositive": "月薪需大于 0",
    "validation.dailyPositive": "日薪需大于 0",
    "validation.hourlyPositive": "时薪需大于 0",
    "validation.workDaysPositive": "工作天数需大于 0",
    "validation.workDaysRange": "工作天数不能超过 31",
    "validation.workdaysMinOne": "至少选 1 天",
    "validation.workdaysError": "工作日错误",
    "validation.startTimeError": "上班时间错误",
    "validation.endTimeError": "下班时间错误",
    "validation.timeSameError": "时间不能相同",
    "validation.lunchStartError": "午休开始错误",
    "validation.lunchEndError": "午休结束错误",
    "validation.lunchSameError": "午休起止时间不能相同",
    "validation.nightLunchOutside": "夜班午休需在工时内",
    "validation.lunchOutside": "午休需在工时内",
    "validation.bigWeekExtraDaysEmpty": "至少选 1 个大周额外工作日",
    "validation.bigWeekExtraDaysError": "大周额外工作日必须是一周中的某天",
    "validation.bigWeekExtraDaysOverlap": "大周额外工作日不能与小周工作日重复",
    "validation.bigWeekAnchorError": "大周起始周无效，请重新对齐",
  };
  return map[key] ?? key;
};

const at = (time: string) => new Date(`2026-05-11T${time}:00`);

const config: SalaryConfig = {
  ...defaultSalaryConfig,
  salaryType: "monthly",
  monthlySalary: 21750,
  dailySalary: 1000,
  hourlyRate: 125,
  workDaysPerMonth: 21.75,
  workdays: [1, 2, 3, 4, 5],
  startTime: "09:00",
  endTime: "18:00",
  lunchStart: "12:00",
  lunchEnd: "13:00",
  enableLunchBreak: true,
};

describe("calculateSalarySnapshot", () => {
  it("calculates rates from monthly salary and effective work hours", () => {
    const snapshot = calculateSalarySnapshot(at("10:00"), config);

    expect(snapshot.dailySalary).toBe(1000);
    expect(snapshot.workMsToday).toBe(8 * 3_600_000);
    expect(snapshot.hourlyRate).toBe(125);
    expect(snapshot.minuteRate).toBeCloseTo(125 / 60);
    expect(snapshot.secondRate).toBeCloseTo(125 / 3600);
    expect(snapshot.status).toBe("working");
  });

  it("calculates rates from daily salary mode", () => {
    const snapshot = calculateSalarySnapshot(at("10:00"), {
      ...config,
      salaryType: "daily",
      monthlySalary: 1,
      dailySalary: 800,
    });

    expect(snapshot.dailySalary).toBe(800);
    expect(snapshot.hourlyRate).toBe(100);
    expect(snapshot.earnedToday).toBeCloseTo(100);
  });

  it("calculates rates from hourly salary mode", () => {
    const snapshot = calculateSalarySnapshot(at("10:00"), {
      ...config,
      salaryType: "hourly",
      monthlySalary: 1,
      hourlyRate: 90,
    });

    expect(snapshot.dailySalary).toBe(720);
    expect(snapshot.hourlyRate).toBe(90);
    expect(snapshot.earnedToday).toBeCloseTo(90);
  });

  it("returns rest day status and zero earnings outside configured workdays", () => {
    const snapshot = calculateSalarySnapshot(new Date("2026-05-10T10:00:00"), config);

    expect(snapshot.status).toBe("rest-day");
    expect(snapshot.earnedToday).toBe(0);
    expect(snapshot.workMsToday).toBe(0);
  });

  it("keeps earned amount at zero before work starts", () => {
    const snapshot = calculateSalarySnapshot(at("08:59"), config);

    expect(snapshot.earnedToday).toBe(0);
    expect(snapshot.progress).toBe(0);
    expect(snapshot.isWorking).toBe(false);
    expect(snapshot.status).toBe("before-work");
    expect(snapshot.nextTransitionMs).toBe(60_000);
  });

  it("holds progress during lunch break", () => {
    const beforeLunch = calculateSalarySnapshot(at("12:00"), config);
    const duringLunch = calculateSalarySnapshot(at("12:30"), config);

    expect(beforeLunch.elapsedWorkMs).toBe(3 * 3_600_000);
    expect(duringLunch.elapsedWorkMs).toBe(beforeLunch.elapsedWorkMs);
    expect(duringLunch.isWorking).toBe(false);
    expect(duringLunch.status).toBe("lunch-break");
    expect(duringLunch.nextTransitionMs).toBe(30 * 60_000);
  });

  it("returns full daily salary after work ends", () => {
    const snapshot = calculateSalarySnapshot(at("18:01"), config);

    expect(snapshot.earnedToday).toBe(1000);
    expect(snapshot.progress).toBe(1);
    expect(snapshot.isWorking).toBe(false);
    expect(snapshot.status).toBe("after-work");
    expect(snapshot.nextTransitionMs).toBe(0);
  });

  it("reports time until the final work end while working", () => {
    const snapshot = calculateSalarySnapshot(at("10:00"), config);

    expect(snapshot.status).toBe("working");
    expect(snapshot.nextTransitionMs).toBe(8 * 3_600_000);
  });

  it("returns after-work exactly at the configured end time", () => {
    const snapshot = calculateSalarySnapshot(at("18:00"), config);

    expect(snapshot.earnedToday).toBe(1000);
    expect(snapshot.progress).toBe(1);
    expect(snapshot.isWorking).toBe(false);
    expect(snapshot.status).toBe("after-work");
  });

  it("ignores invalid lunch fields when lunch break is disabled", () => {
    const snapshot = calculateSalarySnapshot(at("13:30"), {
      ...config,
      enableLunchBreak: false,
      lunchStart: "broken",
      lunchEnd: "also-broken",
    });

    expect(snapshot.workMsToday).toBe(9 * 3_600_000);
    expect(snapshot.earnedToday).toBeCloseTo(500);
  });

  it("returns invalid config status for invalid active salary amount", () => {
    const snapshot = calculateSalarySnapshot(at("10:00"), {
      ...config,
      salaryType: "daily",
      dailySalary: 0,
    });

    expect(snapshot.status).toBe("invalid-config");
    expect(snapshot.earnedToday).toBe(0);
  });

  it("calculates earnings for overnight shifts after midnight", () => {
    const snapshot = calculateSalarySnapshot(new Date("2026-05-12T02:00:00"), {
      ...config,
      salaryType: "daily",
      dailySalary: 800,
      workdays: [1],
      startTime: "22:00",
      endTime: "06:00",
      enableLunchBreak: false,
    });

    expect(snapshot.status).toBe("working");
    expect(snapshot.workMsToday).toBe(8 * 3_600_000);
    expect(snapshot.elapsedWorkMs).toBe(4 * 3_600_000);
    expect(snapshot.earnedToday).toBe(400);
    expect(snapshot.progress).toBe(0.5);
    expect(snapshot.nextTransitionMs).toBe(4 * 3_600_000);
  });

  it("keeps overnight shifts in after-work status after the next-day end time", () => {
    const snapshot = calculateSalarySnapshot(new Date("2026-05-12T06:01:00"), {
      ...config,
      salaryType: "daily",
      dailySalary: 800,
      workdays: [1],
      startTime: "22:00",
      endTime: "06:00",
      enableLunchBreak: false,
    });

    expect(snapshot.status).toBe("after-work");
    expect(snapshot.earnedToday).toBe(800);
    expect(snapshot.progress).toBe(1);
    expect(snapshot.nextTransitionMs).toBe(0);
  });

  it("prefers the completed previous overnight shift before the next overnight shift starts", () => {
    const snapshot = calculateSalarySnapshot(new Date("2026-05-12T06:01:00"), {
      ...config,
      salaryType: "daily",
      dailySalary: 800,
      workdays: [1, 2, 3, 4, 5],
      startTime: "22:00",
      endTime: "06:00",
      enableLunchBreak: false,
    });

    expect(snapshot.status).toBe("after-work");
    expect(snapshot.earnedToday).toBe(800);
    expect(snapshot.progress).toBe(1);
    expect(snapshot.nextTransitionMs).toBe(0);
  });

  it("keeps a workday overnight shift active after crossing into a rest day", () => {
    const snapshot = calculateSalarySnapshot(new Date("2026-05-16T02:00:00"), {
      ...config,
      salaryType: "daily",
      dailySalary: 800,
      workdays: [5],
      startTime: "22:00",
      endTime: "06:00",
      enableLunchBreak: false,
    });

    expect(snapshot.status).toBe("working");
    expect(snapshot.elapsedWorkMs).toBe(4 * 3_600_000);
    expect(snapshot.earnedToday).toBe(400);
  });

  it("keeps a completed workday overnight shift after crossing into a rest day", () => {
    const snapshot = calculateSalarySnapshot(new Date("2026-05-16T06:01:00"), {
      ...config,
      salaryType: "daily",
      dailySalary: 800,
      workdays: [5],
      startTime: "22:00",
      endTime: "06:00",
      enableLunchBreak: false,
    });

    expect(snapshot.status).toBe("after-work");
    expect(snapshot.earnedToday).toBe(800);
  });

  it("marks daytime shifts as night work only after entering the 22:00 work segment", () => {
    const longShiftConfig = {
      ...config,
      workdays: [1],
      startTime: "09:30",
      endTime: "02:30",
      enableLunchBreak: false,
    };

    const beforeNight = calculateSalarySnapshot(
      new Date("2026-05-11T21:59:00"),
      longShiftConfig,
    );
    const atNightStart = calculateSalarySnapshot(
      new Date("2026-05-11T22:00:00"),
      longShiftConfig,
    );
    const afterMidnight = calculateSalarySnapshot(
      new Date("2026-05-12T00:30:00"),
      longShiftConfig,
    );

    expect(beforeNight.status).toBe("working");
    expect(beforeNight.isNightWork).toBe(false);
    expect(atNightStart.status).toBe("working");
    expect(atNightStart.isNightWork).toBe(true);
    expect(afterMidnight.status).toBe("working");
    expect(afterMidnight.isNightWork).toBe(true);
  });

  it("marks completed shifts as night work when they included work after 22:00", () => {
    const normalDay = calculateSalarySnapshot(new Date("2026-05-11T18:30:00"), {
      ...config,
      startTime: "09:30",
      endTime: "18:00",
      enableLunchBreak: false,
    });
    const completedNight = calculateSalarySnapshot(new Date("2026-05-12T02:31:00"), {
      ...config,
      workdays: [1],
      startTime: "09:30",
      endTime: "02:30",
      enableLunchBreak: false,
    });

    expect(normalDay.status).toBe("after-work");
    expect(normalDay.isNightWork).toBe(false);
    expect(completedNight.status).toBe("after-work");
    expect(completedNight.isNightWork).toBe(true);
  });
});

describe("createWorkSpans", () => {
  it("returns a single span when lunch is disabled", () => {
    const spans = createWorkSpans(at("10:00"), {
      ...config,
      enableLunchBreak: false,
    });

    expect(spans).toHaveLength(1);
    expect(spans[0][0].getHours()).toBe(9);
    expect(spans[0][1].getHours()).toBe(18);
  });

  it("returns no spans when enabled lunch time is invalid", () => {
    const spans = createWorkSpans(at("10:00"), {
      ...config,
      lunchStart: "08:00",
      lunchEnd: "08:30",
    });

    expect(spans).toHaveLength(0);
  });

  it("returns an overnight span that ends the next day", () => {
    const spans = createWorkSpans(new Date("2026-05-11T23:00:00"), {
      ...config,
      workdays: [1],
      startTime: "22:00",
      endTime: "06:00",
      enableLunchBreak: false,
    });

    expect(spans).toHaveLength(1);
    expect(spans[0][0].getDate()).toBe(11);
    expect(spans[0][0].getHours()).toBe(22);
    expect(spans[0][1].getDate()).toBe(12);
    expect(spans[0][1].getHours()).toBe(6);
  });

  it("returns overnight spans split by an after-midnight lunch break", () => {
    const spans = createWorkSpans(new Date("2026-05-11T23:00:00"), {
      ...config,
      workdays: [1],
      startTime: "22:00",
      endTime: "06:00",
      lunchStart: "01:00",
      lunchEnd: "02:00",
      enableLunchBreak: true,
    });

    expect(spans).toHaveLength(2);
    const secondSpan = spans[1];
    expect(secondSpan).toBeDefined();
    if (!secondSpan) throw new Error("Expected second overnight work span");

    expect(spans[0][0].getHours()).toBe(22);
    expect(spans[0][1].getDate()).toBe(12);
    expect(spans[0][1].getHours()).toBe(1);
    expect(secondSpan[0].getDate()).toBe(12);
    expect(secondSpan[0].getHours()).toBe(2);
    expect(secondSpan[1].getHours()).toBe(6);
  });
});

describe("validateSalaryConfig", () => {
  it("uses the current first-launch defaults", () => {
    expect(defaultSalaryConfig).toMatchObject({
      salaryType: "monthly",
      monthlySalary: 10_000,
      dailySalary: 360,
      hourlyRate: 45,
      workDaysPerMonth: 22,
      enableLunchBreak: false,
    });
  });

  it("accepts the default configuration", () => {
    expect(validateSalaryConfig(defaultSalaryConfig, vt)).toHaveLength(0);
  });

  it("reports invalid monthly salary, work days, and work time", () => {
    const issues = validateSalaryConfig(
      {
        ...config,
        salaryType: "monthly",
        monthlySalary: 0,
        workDaysPerMonth: 0,
        startTime: "18:00",
        endTime: "18:00",
      },
      vt,
    );

    expect(issues.map((issue) => issue.field)).toEqual([
      "monthlySalary",
      "workDaysPerMonth",
      "workTime",
    ]);
  });

  it("accepts overnight work time and lunch inside the overnight shift", () => {
    expect(
      validateSalaryConfig(
        {
          ...config,
          startTime: "22:00",
          endTime: "06:00",
          lunchStart: "01:00",
          lunchEnd: "02:00",
          enableLunchBreak: true,
        },
        vt,
      ),
    ).toHaveLength(0);
  });

  it("reports invalid daily salary only in daily mode", () => {
    expect(
      validateSalaryConfig(
        {
          ...config,
          salaryType: "daily",
          dailySalary: 0,
          monthlySalary: 1000,
        },
        vt,
      ),
    ).toContainEqual({
      field: "dailySalary",
      message: "日薪需大于 0",
    });

    expect(
      validateSalaryConfig(
        {
          ...config,
          salaryType: "monthly",
          dailySalary: 0,
          monthlySalary: 1000,
        },
        vt,
      ),
    ).not.toContainEqual({
      field: "dailySalary",
      message: "日薪需大于 0",
    });
  });

  it("reports invalid hourly salary only in hourly mode", () => {
    expect(
      validateSalaryConfig(
        {
          ...config,
          salaryType: "hourly",
          hourlyRate: 0,
          monthlySalary: 1000,
        },
        vt,
      ),
    ).toContainEqual({
      field: "hourlyRate",
      message: "时薪需大于 0",
    });
  });

  it("reports missing workdays", () => {
    expect(validateSalaryConfig({ ...config, workdays: [] }, vt)).toContainEqual({
      field: "workdays",
      message: "至少选 1 天",
    });
  });

  it("reports lunch break outside work time only when enabled", () => {
    const invalidLunch = {
      ...config,
      lunchStart: "08:00",
      lunchEnd: "08:30",
    };

    expect(validateSalaryConfig(invalidLunch, vt)).toContainEqual({
      field: "workTime",
      message: "午休需在工时内",
    });

    expect(
      validateSalaryConfig({ ...invalidLunch, enableLunchBreak: false }, vt),
    ).toHaveLength(0);
  });

  it("uses concise messages for invalid monthly salary and same work time", () => {
    const issues = validateSalaryConfig(
      {
        ...config,
        salaryType: "monthly",
        monthlySalary: 0,
        workDaysPerMonth: 0,
        startTime: "18:00",
        endTime: "18:00",
      },
      vt,
    );

    expect(issues).toContainEqual({
      field: "monthlySalary",
      message: "月薪需大于 0",
    });
    expect(issues).toContainEqual({
      field: "workDaysPerMonth",
      message: "工作天数需大于 0",
    });
    expect(issues).toContainEqual({
      field: "workTime",
      message: "时间不能相同",
    });
  });

  it("uses a concise overnight lunch message", () => {
    expect(
      validateSalaryConfig(
        {
          ...config,
          startTime: "22:00",
          endTime: "06:00",
          lunchStart: "20:00",
          lunchEnd: "21:00",
          enableLunchBreak: true,
        },
        vt,
      ),
    ).toContainEqual({
      field: "workTime",
      message: "夜班午休需在工时内",
    });
  });
});

describe("validateSalaryConfig bounds", () => {
  it("rejects more than 31 work days per month", () => {
    const issues = validateSalaryConfig(
      { ...defaultSalaryConfig, workDaysPerMonth: 32 },
      vt,
    );

    expect(issues).toEqual([
      { field: "workDaysPerMonth", message: "工作天数不能超过 31" },
    ]);
  });

  it("reports identical lunch start and end as their own error", () => {
    const issues = validateSalaryConfig(
      {
        ...defaultSalaryConfig,
        enableLunchBreak: true,
        lunchEnd: "12:00",
        lunchStart: "12:00",
      },
      vt,
    );

    expect(issues).toEqual([{ field: "workTime", message: "午休起止时间不能相同" }]);
  });
});

describe("big week (大小周)", () => {
  // 2026-05-11 is a Monday; 2026-05-16 is the Saturday of that same week.
  const bigWeekConfig: SalaryConfig = {
    ...config,
    bigWeekEnabled: true,
    bigWeekExtraDays: [6],
    bigWeekAnchor: "2026-05-11",
  };

  it("works the extra day of a big week", () => {
    const snapshot = calculateSalarySnapshot(
      new Date("2026-05-16T10:00:00"),
      bigWeekConfig,
    );

    expect(snapshot.status).toBe("working");
  });

  it("rests on the same weekday of a small week", () => {
    const snapshot = calculateSalarySnapshot(
      new Date("2026-05-23T10:00:00"),
      bigWeekConfig,
    );

    expect(snapshot.status).toBe("rest-day");
    expect(snapshot.earnedToday).toBe(0);
  });

  it("accrues pay across the extra day of a big week", () => {
    const morning = calculateSalarySnapshot(
      new Date("2026-05-16T10:00:00"),
      bigWeekConfig,
    );
    const evening = calculateSalarySnapshot(
      new Date("2026-05-16T17:00:00"),
      bigWeekConfig,
    );

    expect(evening.earnedToday).toBeGreaterThan(morning.earnedToday);
  });

  it("keeps the shared weekdays working in both weeks", () => {
    // 2026-05-13 and 2026-05-20 are the Wednesdays of the big and the small week.
    expect(
      calculateSalarySnapshot(new Date("2026-05-13T10:00:00"), bigWeekConfig).status,
    ).toBe("working");
    expect(
      calculateSalarySnapshot(new Date("2026-05-20T10:00:00"), bigWeekConfig).status,
    ).toBe("working");
  });

  it("alternates in the weeks before the anchor", () => {
    // One week before the anchor week is small, two weeks before is big again.
    expect(
      calculateSalarySnapshot(new Date("2026-05-09T10:00:00"), bigWeekConfig).status,
    ).toBe("rest-day");
    expect(
      calculateSalarySnapshot(new Date("2026-05-02T10:00:00"), bigWeekConfig).status,
    ).toBe("working");
  });

  it("reads any day of the anchor week as the same phase", () => {
    const wednesdayAnchor: SalaryConfig = {
      ...bigWeekConfig,
      bigWeekAnchor: "2026-05-13",
    };

    expect(
      calculateSalarySnapshot(new Date("2026-05-16T10:00:00"), wednesdayAnchor, vt)
        .status,
    ).toBe("working");
    expect(
      calculateSalarySnapshot(new Date("2026-05-23T10:00:00"), wednesdayAnchor, vt)
        .status,
    ).toBe("rest-day");
  });

  it("alternates across a month boundary", () => {
    expect(
      calculateSalarySnapshot(new Date("2026-05-30T10:00:00"), bigWeekConfig).status,
    ).toBe("working");
    expect(
      calculateSalarySnapshot(new Date("2026-06-06T10:00:00"), bigWeekConfig).status,
    ).toBe("rest-day");
  });

  it("alternates across a year boundary", () => {
    const yearEndConfig: SalaryConfig = {
      ...bigWeekConfig,
      bigWeekAnchor: "2026-12-28",
    };

    expect(
      calculateSalarySnapshot(new Date("2027-01-02T10:00:00"), yearEndConfig).status,
    ).toBe("working");
    expect(
      calculateSalarySnapshot(new Date("2027-01-09T10:00:00"), yearEndConfig).status,
    ).toBe("rest-day");
  });

  it("ignores the extra days while the toggle is off", () => {
    const disabled: SalaryConfig = { ...bigWeekConfig, bigWeekEnabled: false };
    const saturday = new Date("2026-05-16T10:00:00");
    const wednesday = new Date("2026-05-13T10:00:00");

    expect(calculateSalarySnapshot(saturday, disabled)).toEqual(
      calculateSalarySnapshot(saturday, config),
    );
    expect(calculateSalarySnapshot(wednesday, disabled)).toEqual(
      calculateSalarySnapshot(wednesday, config),
    );
  });

  it("reports an unreadable anchor instead of silently resting", () => {
    const broken: SalaryConfig = { ...bigWeekConfig, bigWeekAnchor: "2026-02-31" };

    expect(calculateSalarySnapshot(new Date("2026-05-16T10:00:00"), broken).status).toBe(
      "invalid-config",
    );
    expect(validateSalaryConfig(broken, vt).map((issue) => issue.field)).toContain(
      "bigWeekAnchor",
    );
  });
});

describe("big week night shifts (大小周跨零点夜班)", () => {
  // 2026-05-11 is a Monday, so 05-15 is the Friday of the big week and 05-22 the Friday of the
  // small one; 05-16 and 05-23 are their Saturdays.
  const nightShiftConfig: SalaryConfig = {
    ...config,
    startTime: "22:00",
    endTime: "06:00",
    enableLunchBreak: false,
    bigWeekEnabled: true,
    bigWeekExtraDays: [6],
    bigWeekAnchor: "2026-05-11",
  };

  it("runs a Friday night shift past midnight into a big-week Saturday", () => {
    const snapshot = calculateSalarySnapshot(
      new Date("2026-05-16T02:00:00"),
      nightShiftConfig,
    );

    expect(snapshot.status).toBe("working");
    expect(snapshot.elapsedWorkMs).toBe(4 * 3_600_000);
    expect(snapshot.isNightWork).toBe(true);
  });

  it("runs a Friday night shift past midnight into a small-week Saturday", () => {
    const snapshot = calculateSalarySnapshot(
      new Date("2026-05-23T02:00:00"),
      nightShiftConfig,
    );

    expect(snapshot.status).toBe("working");
    expect(snapshot.elapsedWorkMs).toBe(4 * 3_600_000);
  });

  it("works a big-week Saturday night through to Sunday", () => {
    const snapshot = calculateSalarySnapshot(
      new Date("2026-05-17T02:00:00"),
      nightShiftConfig,
    );

    expect(snapshot.status).toBe("working");
    expect(snapshot.isNightWork).toBe(true);
  });

  it("rests on a small-week Saturday night", () => {
    const snapshot = calculateSalarySnapshot(
      new Date("2026-05-24T02:00:00"),
      nightShiftConfig,
    );

    expect(snapshot.status).toBe("rest-day");
    expect(snapshot.earnedToday).toBe(0);
  });

  it("reports the finished night shift after a big-week Saturday night", () => {
    const snapshot = calculateSalarySnapshot(
      new Date("2026-05-17T07:00:00"),
      nightShiftConfig,
    );

    expect(snapshot.status).toBe("after-work");
    expect(snapshot.isNightWork).toBe(true);
  });
});

describe("effective hourly rate (实际时薪)", () => {
  // ¥375 for the 8-hour day above, with no overtime pay of any kind.
  const unpaidOvertimeConfig: SalaryConfig = {
    ...config,
    salaryType: "daily",
    dailySalary: 375,
  };

  it("includes configured overtime hours and pay, and keeps the old rate when disabled", () => {
    const overtimeConfig = {
      ...unpaidOvertimeConfig,
      overtimeEnabled: true,
      overtimeHours: 2,
      overtimePay: 100,
    };
    const before = calculateSalarySnapshot(at("10:00"), overtimeConfig);
    const halfway = calculateSalarySnapshot(at("19:00"), overtimeConfig);
    const complete = calculateSalarySnapshot(at("20:00"), overtimeConfig);
    const disabled = calculateSalarySnapshot(at("20:00"), {
      ...overtimeConfig,
      overtimeEnabled: false,
    });

    expect(before.effectiveHourlyRate).toBe(47.5);
    expect(before.earnedToday).toBe(375 / 8);
    expect(halfway.earnedToday).toBe(425);
    expect(complete.earnedToday).toBe(475);
    expect(complete.effectiveHourlyRate).toBe(47.5);
    expect(disabled.earnedToday).toBe(375);
    expect(disabled.effectiveHourlyRate).toBe(37.5);
  });

  it("rejects invalid enabled overtime inputs", () => {
    const issues = validateSalaryConfig(
      {
        ...unpaidOvertimeConfig,
        overtimeEnabled: true,
        overtimeHours: 0,
        overtimePay: 20,
      },
      vt,
    );
    expect(issues.some((issue) => issue.field === "overtimeHours")).toBe(true);
  });

  it("accrues configured overtime pay beyond the automatic four-hour cap", () => {
    const snapshot = calculateSalarySnapshot(at("23:00"), {
      ...unpaidOvertimeConfig,
      overtimeEnabled: true,
      overtimeHours: 5,
      overtimePay: 100,
    });
    expect(snapshot.earnedToday).toBe(475);
    expect(snapshot.effectiveHourlyRate).toBeCloseTo(475 / 13);
  });

  it("equals the configured hourly rate while working normally, in every salary mode", () => {
    // All three modes describe the same 8-hour day: ¥1000/day, ¥900/day, ¥90/h.
    const monthly = calculateSalarySnapshot(at("10:00"), config);
    const daily = calculateSalarySnapshot(at("10:00"), {
      ...config,
      salaryType: "daily",
      dailySalary: 900,
    });
    const hourly = calculateSalarySnapshot(at("10:00"), {
      ...config,
      salaryType: "hourly",
      hourlyRate: 90,
    });

    expect(monthly.effectiveHourlyRate).toBe(125);
    expect(daily.effectiveHourlyRate).toBe(112.5);
    expect(hourly.effectiveHourlyRate).toBe(90);
  });

  it("drops while overtime hours earn nothing extra", () => {
    // The worked example from the spec: ¥375 for an 8-hour day, then two unpaid overtime hours.
    const normalHours = calculateSalarySnapshot(at("10:00"), unpaidOvertimeConfig);
    const overtime = calculateSalarySnapshot(at("20:00"), unpaidOvertimeConfig);

    expect(normalHours.effectiveHourlyRate).toBe(46.875);
    expect(overtime.status).toBe("after-work");
    expect(overtime.earnedToday).toBe(375);
    expect(overtime.progress).toBe(1);
    expect(overtime.elapsedWorkMs).toBe(10 * 3_600_000);
    expect(overtime.effectiveHourlyRate).toBe(37.5);
  });

  it("stops counting overtime at four hours past the end time", () => {
    // 18:00 end: 22:00 is the fourth overtime hour, 23:00 is already past the point where the
    // program still assumes the user is at work.
    const atCap = calculateSalarySnapshot(at("22:00"), unpaidOvertimeConfig);
    const pastCap = calculateSalarySnapshot(at("23:00"), unpaidOvertimeConfig);

    expect(atCap.elapsedWorkMs).toBe(12 * 3_600_000);
    expect(atCap.effectiveHourlyRate).toBe(31.25);
    expect(pastCap.elapsedWorkMs).toBe(atCap.elapsedWorkMs);
    expect(pastCap.effectiveHourlyRate).toBe(atCap.effectiveHourlyRate);
  });

  it("holds through the lunch break", () => {
    const beforeLunch = calculateSalarySnapshot(at("12:00"), config);
    const duringLunch = calculateSalarySnapshot(at("12:30"), config);

    expect(duringLunch.effectiveHourlyRate).toBe(beforeLunch.effectiveHourlyRate);
  });

  it("shows the configured rate before work starts", () => {
    const snapshot = calculateSalarySnapshot(at("08:59"), config);

    expect(snapshot.elapsedWorkMs).toBe(0);
    expect(snapshot.effectiveHourlyRate).toBe(125);
  });

  it("is zero on a rest day and zero while the config is invalid", () => {
    const restDay = calculateSalarySnapshot(new Date("2026-05-10T10:00:00"), config);
    const invalid = calculateSalarySnapshot(at("10:00"), {
      ...config,
      salaryType: "daily",
      dailySalary: 0,
    });

    expect(restDay.status).toBe("rest-day");
    expect(restDay.effectiveHourlyRate).toBe(0);
    expect(invalid.status).toBe("invalid-config");
    expect(invalid.effectiveHourlyRate).toBe(0);
  });

  it("dilutes an overtime hour after an overnight shift and starts fresh on the next one", () => {
    const nightShiftConfig: SalaryConfig = {
      ...config,
      salaryType: "daily",
      dailySalary: 900,
      workdays: [1, 2],
      startTime: "22:00",
      endTime: "06:00",
      enableLunchBreak: false,
    };

    // Monday 22:00–06:00 earns ¥900; 07:00 the next morning is one unpaid overtime hour.
    const afterNightShift = calculateSalarySnapshot(
      new Date("2026-05-12T07:00:00"),
      nightShiftConfig,
    );
    // That night's own shift starts at 22:00, half an hour before this reading.
    const nextShift = calculateSalarySnapshot(
      new Date("2026-05-12T22:30:00"),
      nightShiftConfig,
    );

    expect(afterNightShift.status).toBe("after-work");
    expect(afterNightShift.elapsedWorkMs).toBe(9 * 3_600_000);
    expect(afterNightShift.effectiveHourlyRate).toBe(100);
    expect(nextShift.status).toBe("working");
    expect(nextShift.elapsedWorkMs).toBe(30 * 60_000);
    expect(nextShift.effectiveHourlyRate).toBe(112.5);
  });
});

describe("validateSalaryConfig big week", () => {
  const enabled: SalaryConfig = {
    ...config,
    bigWeekEnabled: true,
    bigWeekExtraDays: [6],
    bigWeekAnchor: "2026-05-11",
  };

  it("accepts an enabled big week", () => {
    expect(validateSalaryConfig(enabled, vt)).toHaveLength(0);
  });

  it("reports an enabled big week that has no extra day", () => {
    expect(validateSalaryConfig({ ...enabled, bigWeekExtraDays: [] }, vt)).toEqual([
      { field: "bigWeekExtraDays", message: "至少选 1 个大周额外工作日" },
    ]);
  });

  it("reports an extra day that repeats a small-week workday", () => {
    expect(validateSalaryConfig({ ...enabled, bigWeekExtraDays: [1, 6] }, vt)).toEqual([
      { field: "bigWeekExtraDays", message: "大周额外工作日不能与小周工作日重复" },
    ]);
  });

  it("reports an extra day that is not a day of the week", () => {
    expect(validateSalaryConfig({ ...enabled, bigWeekExtraDays: [7] }, vt)).toEqual([
      { field: "bigWeekExtraDays", message: "大周额外工作日必须是一周中的某天" },
    ]);
  });

  it("reports an anchor that is not a date", () => {
    expect(validateSalaryConfig({ ...enabled, bigWeekAnchor: "2026-02-31" }, vt)).toEqual(
      [{ field: "bigWeekAnchor", message: "大周起始周无效，请重新对齐" }],
    );
  });

  it("ignores the big-week fields while the toggle is off", () => {
    const issues = validateSalaryConfig(
      {
        ...config,
        bigWeekEnabled: false,
        bigWeekExtraDays: [],
        bigWeekAnchor: "not-a-date",
      },
      vt,
    );

    expect(issues).toHaveLength(0);
  });
});
