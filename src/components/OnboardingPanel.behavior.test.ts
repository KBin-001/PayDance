// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defaultSalaryConfig } from "../lib/salary";
import OnboardingPanel from "./OnboardingPanel.vue";

const mountOnboardingPanel = (config = defaultSalaryConfig) =>
  mount(OnboardingPanel, {
    props: {
      alwaysOnTop: true,
      autostartEnabled: false,
      config: { ...config, workdays: [...config.workdays] },
      themeMode: "light",
    },
  });

const findSwitch = (wrapper: ReturnType<typeof mountOnboardingPanel>, label: string) =>
  wrapper
    .findAll('input[type="checkbox"]')
    .find((input) => input.element.parentElement?.textContent?.includes(label));

const findPicker = (wrapper: ReturnType<typeof mountOnboardingPanel>, label: string) =>
  wrapper
    .findAll(".weekday-control")
    .find((picker) => picker.attributes("aria-label") === label);

// Step 0 is preferences and step 1 is salary, so the work-time step is two clicks in.
const goToWorkTimeStep = async (wrapper: ReturnType<typeof mountOnboardingPanel>) => {
  await wrapper.get(".primary-button").trigger("click");
  await wrapper.get(".primary-button").trigger("click");
};

describe("OnboardingPanel behavior", () => {
  it("shows language preferences before salary fields on first launch", () => {
    const wrapper = mountOnboardingPanel();

    expect(wrapper.text()).toContain("语言");
    expect(wrapper.text()).toContain("English");
    expect(wrapper.text()).not.toContain("月薪");
  });

  it("keeps lunch time fields hidden until lunch exclusion is enabled", async () => {
    const wrapper = mountOnboardingPanel();

    await goToWorkTimeStep(wrapper);

    expect(wrapper.text()).toContain("剔除午休");
    expect(wrapper.findAll('input[type="time"]')).toHaveLength(2);

    await findSwitch(wrapper, "剔除午休")?.setValue(true);

    expect(wrapper.emitted("update:config")?.[0]?.[0]).toMatchObject({
      enableLunchBreak: true,
    });
  });

  it("sends the same big-week payload as the settings panel", async () => {
    // 2026-05-13 is a Wednesday, so the week the user is in started on 2026-05-11 — the same
    // payload the settings panel emits for the same interaction.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T09:00:00"));
    try {
      const wrapper = mountOnboardingPanel();
      await goToWorkTimeStep(wrapper);

      const toggle = findSwitch(wrapper, "大小周模式");
      expect(toggle).toBeDefined();

      await toggle?.setValue(true);

      expect(wrapper.emitted("update:config")?.[0]?.[0]).toMatchObject({
        bigWeekEnabled: true,
        bigWeekAnchor: "2026-05-11",
        bigWeekExtraDays: [6],
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the same big-week controls the settings panel shows", async () => {
    const wrapper = mountOnboardingPanel({
      ...defaultSalaryConfig,
      bigWeekEnabled: true,
    });
    await goToWorkTimeStep(wrapper);

    expect(
      wrapper
        .findAll('[role="radiogroup"]')
        .map((group) => group.attributes("aria-label")),
    ).toContain("本周是");
    expect(findPicker(wrapper, "大周额外工作日")?.exists()).toBe(true);
  });

  it("emits theme preference changes from the usage preference step", async () => {
    const wrapper = mountOnboardingPanel();

    await wrapper
      .findAll(".segmented-control button")
      .find((button) => button.text() === "深色")
      ?.trigger("click");

    expect(wrapper.emitted("update:themeMode")?.[0]).toEqual(["dark"]);
  });
});
