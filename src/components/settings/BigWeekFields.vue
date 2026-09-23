<script setup lang="ts">
// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md
import { computed } from "vue";
import {
  isBigWeek,
  unalignedBigWeekAnchor,
  type SalaryConfig,
  type SalaryConfigIssue,
} from "../../lib/salary";
import {
  alignBigWeekAnchor,
  createBigWeekExtraDayOptions,
  reconcileBigWeekExtraDays,
} from "../../lib/settings-form";
import { useI18n } from "../../composables/useI18n";
import SegmentedControl from "../ui/SegmentedControl.vue";
import SwitchRow from "../ui/SwitchRow.vue";
import WorkdayPicker from "./WorkdayPicker.vue";

const { t } = useI18n();

const props = defineProps<{
  config: SalaryConfig;
  density: "settings" | "onboarding";
  hasIssue: (field: SalaryConfigIssue["field"]) => boolean;
}>();

const emit = defineEmits<{
  "update:config": [config: SalaryConfig];
}>();

const extraDays = computed(() =>
  createBigWeekExtraDayOptions(
    t.value,
    props.config.workdays,
    props.config.bigWeekExtraDays,
  ),
);

const weekPhase = { big: "big", small: "small" } as const;

const weekPhaseOptions = computed(() => [
  { label: t.value("bigWeek.bigWeek"), value: weekPhase.big },
  { label: t.value("bigWeek.smallWeek"), value: weekPhase.small },
]);

// A phase only turns over on a Monday, so one reading of the clock per render is enough for the
// highlight; every click below reads it again and writes the right anchor either way.
const currentWeekPhase = computed(() =>
  isBigWeek(new Date(), props.config) ? weekPhase.big : weekPhase.small,
);

const updateWeekPhase = (phase: string) => {
  emit("update:config", {
    ...props.config,
    bigWeekAnchor: alignBigWeekAnchor(new Date(), phase === weekPhase.big),
  });
};

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
  // without a second decision — but only for a config that was never aligned, so that an alignment
  // the user chose survives a switch off and on. The extra days are reconciled so that turning the
  // toggle on always produces two weeks that actually differ.
  emit("update:config", {
    ...props.config,
    bigWeekEnabled: true,
    bigWeekAnchor:
      props.config.bigWeekAnchor === unalignedBigWeekAnchor
        ? alignBigWeekAnchor(new Date(), true)
        : props.config.bigWeekAnchor,
    bigWeekExtraDays: reconcileBigWeekExtraDays(
      extraDays.value.free,
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
      :invalid="hasIssue('bigWeekExtraDays')"
      :label="t('bigWeek.extraDays')"
      :options="extraDays.offered"
      :workdays="config.bigWeekExtraDays"
      @update:workdays="updateConfig('bigWeekExtraDays', $event)"
    />

    <SegmentedControl
      v-if="config.bigWeekEnabled"
      :columns="2"
      :density="density"
      :invalid="hasIssue('bigWeekAnchor')"
      :label="t('bigWeek.thisWeek')"
      :model-value="currentWeekPhase"
      :options="weekPhaseOptions"
      @update:model-value="updateWeekPhase"
    />
  </div>
</template>

<style scoped>
.big-week-fields {
  display: grid;
  gap: clamp(9px, 2.1cqh, 12px);
}
</style>
