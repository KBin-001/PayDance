// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, ref } from "vue";
import { provideCurrency } from "../composables/useCurrency";
import { emptySnapshot } from "../lib/salary";
import MainDashboard from "./MainDashboard.vue";

const mountDashboard = (symbol: string, effectiveHourlyRateText: string) =>
  mount(
    defineComponent({
      setup() {
        provideCurrency(ref(symbol));
        return () =>
          h(MainDashboard, {
            amountMode: "rolling",
            dailyEarnText: "375.00",
            earnedText: "375.00",
            effectiveHourlyRateText,
            middleStat: { label: "今日完成", value: "100%" },
            snapshot: { ...emptySnapshot, status: "after-work" },
            suspendAmountPulse: false,
            workedTimeText: "10h",
          });
      },
    }),
  );

const rateLineText = (wrapper: ReturnType<typeof mountDashboard>) =>
  wrapper.get(".hero-rate").text().replace(/\s+/g, " ");

describe("live hourly rate on the main dashboard", () => {
  it("reads the rate under today's earnings with the currency symbol and an hourly unit", () => {
    expect(rateLineText(mountDashboard("¥", "37.50"))).toMatch(
      /当前时薪\s*¥37\.50\s*\/h/,
    );
  });

  it("drops the symbol when the user hid it", () => {
    const text = rateLineText(mountDashboard("", "37.50"));

    expect(text).toContain("37.50");
    expect(text).not.toContain("¥");
  });

  it("shows no line at all while the config needs fixing", () => {
    expect(mountDashboard("¥", "").find(".hero-rate").exists()).toBe(false);
  });
});
