<script setup lang="ts">
// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md
import { computed } from "vue";
import type { SalaryConfig } from "../../lib/salary";
import {
  alignBigWeekAnchor,
  createBigWeekExtraDayOptions,
  reconcileBigWeekExtraDays,
} from "../../lib/settings-form";
import { useI18n } from "../../composables/useI18n";
import SwitchRow from "../ui/SwitchRow.vue";
import WorkdayPicker from "./WorkdayPicker.vue";

const { t } = useI18n();

const props = defineProps<{
  config: SalaryConfig;
  density: "settings" | "onboarding";
}>();

const emit = defineEmits<{
  "update:config": [config: SalaryConfig];
}>();

// The extra days can only be the ones the small week leaves free: any other choice would describe
// two identical weeks, which is the thing this toggle exists to express.
const extraDayOptions = computed(() =>
  createBigWeekExtraDayOptions(t.value, props.config.workdays),
);

const extraDayValues = computed(() =>
  extraDayOptions.value.map((option) => option.value),
);

const updateConfig = <Key extends keyof SalaryConfig>(
  key: Key,
  value: SalaryConfig[Key],
) => {
  emit("update:config", { ...props.config, [key]: value });
};

const updateEnabled = (enabled: boolean) => {
  // Switching the toggle off keeps the anchor and the extra days, so the phase survives an
  // accidental off-and-on.
  if (!enabled) {
    emit("update:config", { ...props.config, bigWeekEnabled: false });
    return;
  }

  // Switching it on makes the week the user is in a big week, so the alternation is aligned
  // without a second decision, and the extra days are reconciled so that turning the toggle on
  // always produces two weeks that actually differ.
  emit("update:config", {
    ...props.config,
    bigWeekEnabled: true,
    bigWeekAnchor: alignBigWeekAnchor(new Date(), true),
    bigWeekExtraDays: reconcileBigWeekExtraDays(
      extraDayValues.value,
      props.config.bigWeekExtraDays,
    ),
  });
};
</script>

<template>
  <div class="big-week-fields">
    <SwitchRow
      :label="t('bigWeek.toggle')"
      :model-value="config.bigWeekEnabled"
      @update:model-value="updateEnabled"
    />

    <WorkdayPicker
      v-if="config.bigWeekEnabled"
      :density="density"
      :label="t('bigWeek.extraDays')"
      :options="extraDayOptions"
      :workdays="config.bigWeekExtraDays"
      @update:workdays="updateConfig('bigWeekExtraDays', $event)"
    />
  </div>
</template>

<style scoped>
.big-week-fields {
  display: grid;
  gap: clamp(9px, 2.1cqh, 12px);
}
</style>
