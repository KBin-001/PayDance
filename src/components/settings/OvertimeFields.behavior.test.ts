// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defaultSalaryConfig } from "../../lib/salary";
import OvertimeFields from "./OvertimeFields.vue";

describe("OvertimeFields", () => {
  it("starts disabled and emits entered overtime values after enabling", async () => {
    const wrapper = mount(OvertimeFields, {
      props: { config: { ...defaultSalaryConfig }, hasIssue: () => false },
    });
    expect(
      wrapper
        .findAll('input[type="number"]')
        .every((input) => input.attributes("disabled") !== undefined),
    ).toBe(true);

    await wrapper.get('input[type="checkbox"]').setValue(true);
    expect(wrapper.emitted("update:config")?.[0]?.[0]).toMatchObject({
      overtimeEnabled: true,
    });

    await wrapper.setProps({ config: { ...defaultSalaryConfig, overtimeEnabled: true } });
    await wrapper.get('input[type="number"]').setValue("2.5");
    expect(wrapper.emitted("update:config")?.[1]?.[0]).toMatchObject({
      overtimeHours: 2.5,
    });
  });
});
