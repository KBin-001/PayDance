// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defaultCurrencySymbol } from "../lib/currency";
import { defaultSalaryConfig, type SalaryConfigIssue } from "../lib/salary";

vi.mock("#updater", () => ({
  downloadAndInstall: vi.fn(async () => ({ kind: "upToDate" })),
}));

vi.mock("#opener", () => ({
  openExternalUrl: vi.fn(async () => {}),
}));

import SettingsPanel from "./SettingsPanel.vue";

const mountSettingsPanel = (
  config = defaultSalaryConfig,
  hasIssue: (field: SalaryConfigIssue["field"]) => boolean = () => false,
  showOnboardingAction = false,
) =>
  mount(SettingsPanel, {
    props: {
      amountMode: "rolling",
      autostartEnabled: false,
      autostartError: "",
      config: { ...config, workdays: [...config.workdays] },
      currencySymbol: defaultCurrencySymbol,
      firstIssue: "",
      hasIssue,
      isAutostartUpdating: false,
      showDesktopFeatures: true,
      showOnboardingAction,
      updateStatus: { kind: "upToDate" },
    },
  });

describe("SettingsPanel behavior", () => {
  it("shows only the inputs required by the selected salary mode", async () => {
    const wrapper = mountSettingsPanel();

    expect(wrapper.findAll('input[type="number"]').length).toBeGreaterThanOrEqual(2);

    await wrapper.setProps({
      config: {
        ...defaultSalaryConfig,
        salaryType: "daily",
        workdays: [...defaultSalaryConfig.workdays],
      },
    });

    expect(wrapper.findAll('input[type="number"]').length).toBeGreaterThanOrEqual(1);
    expect(wrapper.text()).toContain("日薪");
    expect(wrapper.text()).not.toContain("每月工作天数");
  });

  it("emits shared workday updates from the weekday control", async () => {
    const wrapper = mountSettingsPanel();
    const saturdayButton = wrapper
      .findAll(".weekday-control button")
      .find((button) => button.text() === "六");

    await saturdayButton?.trigger("click");

    expect(wrapper.emitted("update:config")?.[0]?.[0]).toMatchObject({
      workdays: [1, 2, 3, 4, 5, 6],
    });
  });

  it("hides the first-time setup action by default", () => {
    const wrapper = mountSettingsPanel();

    expect(wrapper.find(".onboarding-action-button").exists()).toBe(false);
  });

  it("opens the first-time setup when the Web Preview enables it", async () => {
    const wrapper = mountSettingsPanel(
      { ...defaultSalaryConfig, workdays: [...defaultSalaryConfig.workdays] },
      () => false,
      true,
    );

    await wrapper.get(".onboarding-action-button").trigger("click");

    expect(wrapper.emitted("openOnboarding")).toHaveLength(1);
  });

  it("keeps the first-time setup title and action in one title row", () => {
    const wrapper = mountSettingsPanel(
      { ...defaultSalaryConfig, workdays: [...defaultSalaryConfig.workdays] },
      () => false,
      true,
    );
    const actionButton = wrapper.get(".onboarding-action-button");
    const titleRow = actionButton.element.parentElement;

    expect(titleRow?.classList.contains("group-title--split")).toBe(true);
    expect(titleRow?.querySelector("strong")?.textContent).toContain("首次启动向导");
  });
});

const findBigWeekToggle = (wrapper: ReturnType<typeof mountSettingsPanel>) =>
  wrapper
    .findAll('input[type="checkbox"]')
    .find((input) => input.element.parentElement?.textContent?.includes("大小周模式"));

const findPhaseControl = (wrapper: ReturnType<typeof mountSettingsPanel>) =>
  wrapper
    .findAll('[role="radiogroup"]')
    .find((group) => group.attributes("aria-label") === "本周是");

const findWeekPhaseButton = (
  wrapper: ReturnType<typeof mountSettingsPanel>,
  label: string,
) =>
  findPhaseControl(wrapper)
    ?.findAll("button")
    .find((button) => button.text() === label);

describe("SettingsPanel big week", () => {
  it("reveals the extra-day picker only while the toggle is on", async () => {
    const wrapper = mountSettingsPanel();

    expect(wrapper.findAll(".weekday-control")).toHaveLength(1);

    await wrapper.setProps({
      config: {
        ...defaultSalaryConfig,
        workdays: [...defaultSalaryConfig.workdays],
        bigWeekEnabled: true,
      },
    });

    const pickers = wrapper.findAll(".weekday-control");
    expect(pickers).toHaveLength(2);
    expect(pickers[1].attributes("aria-label")).toBe("大周额外工作日");
    expect(pickers[1].findAll("button").map((button) => button.text())).toEqual([
      "六",
      "日",
    ]);
  });

  it("aligns the big-week anchor to the current week when the toggle is switched on", async () => {
    // 2026-05-13 is a Wednesday, so the week the user is in started on 2026-05-11.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T09:00:00"));
    try {
      const wrapper = mountSettingsPanel();

      await findBigWeekToggle(wrapper)?.setValue(true);

      expect(wrapper.emitted("update:config")?.[0]?.[0]).toMatchObject({
        bigWeekEnabled: true,
        bigWeekAnchor: "2026-05-11",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("turns the toggle on into two weeks that differ", async () => {
    // This small week already works Saturday, so the default Saturday extra day would describe the
    // same week twice and cannot be kept.
    const wrapper = mountSettingsPanel({
      ...defaultSalaryConfig,
      workdays: [1, 2, 3, 4, 5, 6],
    });

    await findBigWeekToggle(wrapper)?.setValue(true);

    expect(wrapper.emitted("update:config")?.[0]?.[0]).toMatchObject({
      bigWeekEnabled: true,
      bigWeekExtraDays: [0],
    });
  });

  it("keeps a repeated extra day visible so it can be cleared", async () => {
    // Saturday is worked in both weeks here, so the extra-day row still has to offer it: otherwise
    // the invalid choice would be invisible and impossible to undo.
    const wrapper = mountSettingsPanel({
      ...defaultSalaryConfig,
      workdays: [1, 2, 3, 4, 5, 6],
      bigWeekEnabled: true,
      bigWeekExtraDays: [6],
    });
    const extraDayButtons = wrapper.findAll(".weekday-control")[1].findAll("button");

    expect(extraDayButtons.map((button) => button.text())).toEqual(["六", "日"]);

    await extraDayButtons[0].trigger("click");

    expect(wrapper.emitted("update:config")?.[0]?.[0]).toMatchObject({
      bigWeekExtraDays: [],
    });
  });

  it("marks the extra-day picker when validation points at it", () => {
    const wrapper = mountSettingsPanel(
      { ...defaultSalaryConfig, bigWeekEnabled: true, bigWeekExtraDays: [] },
      (field) => field === "bigWeekExtraDays",
    );

    expect(wrapper.findAll(".weekday-control")[1].classes()).toContain("is-invalid");
  });

  it("keeps the alignment when the toggle is switched off and on again", async () => {
    const wrapper = mountSettingsPanel({
      ...defaultSalaryConfig,
      bigWeekAnchor: "2026-05-18",
    });

    await findBigWeekToggle(wrapper)?.setValue(true);

    expect(wrapper.emitted("update:config")?.[0]?.[0]).toMatchObject({
      bigWeekEnabled: true,
      bigWeekAnchor: "2026-05-18",
    });
  });

  it("aligns a config that was never aligned to the current week", async () => {
    // 2026-05-13 is a Wednesday, so the week the user is in started on 2026-05-11.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T09:00:00"));
    try {
      const wrapper = mountSettingsPanel({
        ...defaultSalaryConfig,
        bigWeekAnchor: "",
      });

      await findBigWeekToggle(wrapper)?.setValue(true);

      expect(wrapper.emitted("update:config")?.[0]?.[0]).toMatchObject({
        bigWeekEnabled: true,
        bigWeekAnchor: "2026-05-11",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the phase control only while the toggle is on", async () => {
    const wrapper = mountSettingsPanel();

    expect(findPhaseControl(wrapper)).toBeUndefined();

    await wrapper.setProps({
      config: {
        ...defaultSalaryConfig,
        workdays: [...defaultSalaryConfig.workdays],
        bigWeekEnabled: true,
      },
    });

    expect(findPhaseControl(wrapper)?.exists()).toBe(true);
  });

  it("shows which week the user is in", () => {
    // 2026-05-11 is the Monday of the week 2026-05-13 falls in.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T09:00:00"));
    try {
      const wrapper = mountSettingsPanel({
        ...defaultSalaryConfig,
        bigWeekEnabled: true,
        bigWeekAnchor: "2026-05-11",
      });

      expect(findWeekPhaseButton(wrapper, "大周")?.classes()).toContain("is-active");
      expect(findWeekPhaseButton(wrapper, "小周")?.classes()).not.toContain("is-active");
    } finally {
      vi.useRealTimers();
    }
  });

  it("aligns the phase to the week the user picks", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T09:00:00"));
    try {
      const wrapper = mountSettingsPanel({
        ...defaultSalaryConfig,
        bigWeekEnabled: true,
        bigWeekAnchor: "2026-05-11",
      });

      await findWeekPhaseButton(wrapper, "小周")?.trigger("click");

      expect(wrapper.emitted("update:config")?.[0]?.[0]).toMatchObject({
        bigWeekAnchor: "2026-05-18",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("switches off without disturbing the anchor", async () => {
    const wrapper = mountSettingsPanel({
      ...defaultSalaryConfig,
      workdays: [...defaultSalaryConfig.workdays],
      bigWeekEnabled: true,
      bigWeekAnchor: "2026-05-11",
    });

    await findBigWeekToggle(wrapper)?.setValue(false);

    expect(wrapper.emitted("update:config")?.[0]?.[0]).toMatchObject({
      bigWeekEnabled: false,
      bigWeekAnchor: "2026-05-11",
    });
  });

  it("emits shared extra-day updates from the big-week picker", async () => {
    const wrapper = mountSettingsPanel({
      ...defaultSalaryConfig,
      workdays: [...defaultSalaryConfig.workdays],
      bigWeekEnabled: true,
    });
    const sundayButton = wrapper
      .findAll(".weekday-control")[1]
      .findAll("button")
      .find((button) => button.text() === "日");

    await sundayButton?.trigger("click");

    expect(wrapper.emitted("update:config")?.[0]?.[0]).toMatchObject({
      bigWeekExtraDays: [0, 6],
    });
  });
});
