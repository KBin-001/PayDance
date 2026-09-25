<script setup lang="ts">
// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md
import { computed, useId } from "vue";
import { useCurrency } from "../../composables/useCurrency";
import { useI18n } from "../../composables/useI18n";
import { defaultCurrencySymbol } from "../../lib/currency";
import { parseNumberInput } from "../../lib/number-input";
import type { SalaryConfig, SalaryConfigIssue } from "../../lib/salary";
import SwitchRow from "../ui/SwitchRow.vue";

const { t } = useI18n();
const { currencySymbol } = useCurrency();
const props = defineProps<{
  config: SalaryConfig;
  hasIssue: (field: SalaryConfigIssue["field"]) => boolean;
}>();
const emit = defineEmits<{ "update:config": [config: SalaryConfig] }>();
const idPrefix = useId();
const amountUnit = computed(() =>
  currencySymbol.value && currencySymbol.value !== defaultCurrencySymbol
    ? currencySymbol.value
    : t.value("salaryAmount.unitYuan"),
);

const updateConfig = <Key extends keyof SalaryConfig>(
  key: Key,
  value: SalaryConfig[Key],
) => {
  emit("update:config", { ...props.config, [key]: value });
};

const updateNumber = (key: "overtimeHours" | "overtimePay", event: Event) => {
  updateConfig(
    key,
    parseNumberInput((event.target as HTMLInputElement).value) ?? Number.NaN,
  );
};

const toggleOvertime = (enabled: boolean) => {
  emit("update:config", {
    ...props.config,
    overtimeEnabled: enabled,
    overtimeHours: Number.isFinite(props.config.overtimeHours)
      ? props.config.overtimeHours
      : 0,
    overtimePay: Number.isFinite(props.config.overtimePay) ? props.config.overtimePay : 0,
  });
};
</script>

<template>
  <div class="overtime-fields">
    <SwitchRow
      :label="t('overtime.toggle')"
      :model-value="config.overtimeEnabled"
      @update:model-value="toggleOvertime"
    />
    <div class="field-grid">
      <label
        class="field"
        :class="{ 'is-invalid': hasIssue('overtimeHours') }"
        :for="`${idPrefix}-overtime-hours`"
      >
        <span>{{ t("overtime.hours") }}</span>
        <span class="field-input-wrap">
          <input
            :id="`${idPrefix}-overtime-hours`"
            :disabled="!config.overtimeEnabled"
            :value="config.overtimeHours"
            min="0"
            step="0.5"
            type="number"
            @input="updateNumber('overtimeHours', $event)"
          />
          <span class="field-unit">{{ t("overtime.unitHours") }}</span>
        </span>
      </label>
      <label
        class="field"
        :class="{ 'is-invalid': hasIssue('overtimePay') }"
        :for="`${idPrefix}-overtime-pay`"
      >
        <span>{{ t("overtime.pay") }}</span>
        <span class="field-input-wrap">
          <input
            :id="`${idPrefix}-overtime-pay`"
            :disabled="!config.overtimeEnabled"
            :value="config.overtimePay"
            min="0"
            step="1"
            type="number"
            @input="updateNumber('overtimePay', $event)"
          />
          <span class="field-unit">{{ amountUnit }}</span>
        </span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.overtime-fields {
  display: grid;
  gap: var(--ui-gap-sm, 10px);
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ui-gap-sm, 10px);
}

.field {
  display: grid;
  gap: var(--ui-gap-xs, 6px);
  min-width: 0;
  color: var(--muted);
  font-size: var(--ui-font-sm, 14px);
  font-weight: 500;
}

.field-input-wrap {
  display: grid;
  height: clamp(34px, 8.2cqh, 40px);
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--ui-radius-sm, 10px);
  background: var(--panel);
}

.field input {
  width: 100%;
  height: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  font-family: var(--font-dashboard);
  font-size: var(--ui-font-sm, 14px);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  outline: none;
  padding: 0 clamp(10px, 2.4cqw, 14px);
}

.field-unit {
  min-width: clamp(34px, 7.5cqw, 44px);
  color: var(--muted);
  font-family: var(--font-dashboard);
  font-size: var(--ui-font-xs, 13px);
  font-weight: 650;
  text-align: center;
  pointer-events: none;
}

.field-input-wrap:focus-within {
  border-color: var(--field-focus-border);
  box-shadow: 0 0 0 3px var(--field-focus-ring);
}

.field.is-invalid .field-input-wrap {
  border-color: rgb(245 158 11 / 0.68);
  box-shadow: 0 0 0 3px rgb(245 158 11 / 0.12);
}

.field-input-wrap:has(input:disabled) {
  background: var(--subtle);
}

.field input:disabled {
  color: var(--muted);
}
</style>
