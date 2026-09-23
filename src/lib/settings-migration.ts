// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import {
  defaultSalaryConfig,
  maxWorkDaysPerMonth,
  unalignedBigWeekAnchor,
  validateSalaryConfig,
  type SalaryConfig,
  type SalaryType,
} from "./salary";
import { parseTimeToMinutes } from "./salary/time";
import { mondayOfWeek, parseDateKey, toDateKey } from "./salary/week-cycle";

export const settingsSchemaVersion = 5;

type PersistedSalaryConfig = Partial<SalaryConfig> | undefined;
export type VersionedSalaryConfigInput = {
  config: unknown;
  schemaVersion: number | undefined;
};
export type SettingsRecoveryReason = "future-schema" | "invalid-values";
export type RecoveredSalaryConfig = {
  config: SalaryConfig;
  recoveryReason?: SettingsRecoveryReason;
};

const defaultWorkdays = defaultSalaryConfig.workdays;
const salaryTypes: SalaryType[] = ["monthly", "daily", "hourly"];

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const isWorkDaysPerMonth = (value: unknown): value is number =>
  isPositiveNumber(value) && value <= maxWorkDaysPerMonth;

const isSalaryType = (value: unknown): value is SalaryType =>
  typeof value === "string" && salaryTypes.includes(value as SalaryType);

const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

const isValidTime = (value: unknown): value is string =>
  typeof value === "string" && Number.isFinite(parseTimeToMinutes(value));

const isWorkday = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 6;

const isBigWeekExtraDays = (value: unknown): value is number[] =>
  Array.isArray(value) && value.length > 0 && value.every(isWorkday);

const isBigWeekAnchor = (value: unknown): value is string =>
  typeof value === "string" &&
  (value === unalignedBigWeekAnchor || parseDateKey(value) !== null);

const normalizeWorkdays = (workdays: unknown) => {
  if (!Array.isArray(workdays)) return [...defaultWorkdays];

  const uniqueWorkdays = [...new Set(workdays)];
  if (uniqueWorkdays.length <= 0 || !uniqueWorkdays.every(isWorkday)) {
    return [...defaultWorkdays];
  }

  return uniqueWorkdays.sort((a, b) => a - b);
};

const normalizeBigWeekExtraDays = (extraDays: unknown) => {
  if (!isBigWeekExtraDays(extraDays)) return [...defaultSalaryConfig.bigWeekExtraDays];

  return [...new Set(extraDays)].sort((a, b) => a - b);
};

// Only the week an anchor falls in decides the phase, so any day of that week is stored as its
// Monday. That keeps a hand-edited anchor from shifting the whole alternation by a week. An anchor
// that cannot be read at all becomes the "never aligned" state instead of an arbitrary phase, and
// validation points at it the moment the toggle is on.
const normalizeBigWeekAnchor = (anchor: unknown) => {
  const parsed = typeof anchor === "string" ? parseDateKey(anchor) : null;

  return parsed ? toDateKey(mondayOfWeek(parsed)) : unalignedBigWeekAnchor;
};

const asPartialConfig = (value: unknown): PersistedSalaryConfig =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as PersistedSalaryConfig)
    : undefined;

const hasOwn = (value: PersistedSalaryConfig, key: keyof SalaryConfig) =>
  Boolean(value && Object.prototype.hasOwnProperty.call(value, key));

const migrateV1ToV2 = (value: unknown) => asPartialConfig(value);
const migrateV2ToV3 = (value: unknown) => asPartialConfig(value);
const migrateV3ToV4 = (value: unknown) => asPartialConfig(value);

// The anchor changed meaning in v5. A v4 config stored either a fixed placeholder or the week the
// toggle happened to be switched on in, and neither is a phase the user picked, so v5 starts such a
// config unaligned: the phase is written the next time the toggle is switched on.
const migrateV4ToV5 = (value: unknown) => {
  const config = asPartialConfig(value);
  if (!config) return config;

  return { ...config, bigWeekAnchor: unalignedBigWeekAnchor };
};

export const settingsMigrations: Record<number, (value: unknown) => unknown> = {
  1: migrateV1ToV2,
  2: migrateV2ToV3,
  3: migrateV3ToV4,
  4: migrateV4ToV5,
};

function normalizeSalaryConfig(
  savedConfig: PersistedSalaryConfig,
  invalidShape = false,
): RecoveredSalaryConfig {
  const salaryType = isSalaryType(savedConfig?.salaryType)
    ? savedConfig.salaryType
    : defaultSalaryConfig.salaryType;

  const config: SalaryConfig = {
    salaryType,
    monthlySalary: isPositiveNumber(savedConfig?.monthlySalary)
      ? savedConfig.monthlySalary
      : defaultSalaryConfig.monthlySalary,
    dailySalary: isPositiveNumber(savedConfig?.dailySalary)
      ? savedConfig.dailySalary
      : defaultSalaryConfig.dailySalary,
    hourlyRate: isPositiveNumber(savedConfig?.hourlyRate)
      ? savedConfig.hourlyRate
      : defaultSalaryConfig.hourlyRate,
    workDaysPerMonth: isWorkDaysPerMonth(savedConfig?.workDaysPerMonth)
      ? savedConfig.workDaysPerMonth
      : defaultSalaryConfig.workDaysPerMonth,
    workdays: normalizeWorkdays(savedConfig?.workdays),
    bigWeekEnabled: isBoolean(savedConfig?.bigWeekEnabled)
      ? savedConfig.bigWeekEnabled
      : defaultSalaryConfig.bigWeekEnabled,
    bigWeekExtraDays: normalizeBigWeekExtraDays(savedConfig?.bigWeekExtraDays),
    bigWeekAnchor: normalizeBigWeekAnchor(savedConfig?.bigWeekAnchor),
    startTime: isValidTime(savedConfig?.startTime)
      ? savedConfig.startTime
      : defaultSalaryConfig.startTime,
    endTime: isValidTime(savedConfig?.endTime)
      ? savedConfig.endTime
      : defaultSalaryConfig.endTime,
    lunchStart: isValidTime(savedConfig?.lunchStart)
      ? savedConfig.lunchStart
      : defaultSalaryConfig.lunchStart,
    lunchEnd: isValidTime(savedConfig?.lunchEnd)
      ? savedConfig.lunchEnd
      : defaultSalaryConfig.lunchEnd,
    enableLunchBreak: isBoolean(savedConfig?.enableLunchBreak)
      ? savedConfig.enableLunchBreak
      : defaultSalaryConfig.enableLunchBreak,
  };

  const fields: Array<[keyof SalaryConfig, (value: unknown) => boolean]> = [
    ["salaryType", isSalaryType],
    ["monthlySalary", isPositiveNumber],
    ["dailySalary", isPositiveNumber],
    ["hourlyRate", isPositiveNumber],
    ["workDaysPerMonth", isWorkDaysPerMonth],
    [
      "workdays",
      (value) => Array.isArray(value) && value.length > 0 && value.every(isWorkday),
    ],
    ["bigWeekEnabled", isBoolean],
    ["bigWeekExtraDays", isBigWeekExtraDays],
    ["bigWeekAnchor", isBigWeekAnchor],
    ["startTime", isValidTime],
    ["endTime", isValidTime],
    ["lunchStart", isValidTime],
    ["lunchEnd", isValidTime],
    ["enableLunchBreak", isBoolean],
  ];
  let recovered =
    invalidShape ||
    fields.some(
      ([key, validate]) => hasOwn(savedConfig, key) && !validate(savedConfig?.[key]),
    );

  const hasConflictingWorkTimes =
    parseTimeToMinutes(config.startTime) === parseTimeToMinutes(config.endTime);
  if (hasConflictingWorkTimes) {
    config.startTime = defaultSalaryConfig.startTime;
    config.endTime = defaultSalaryConfig.endTime;
    recovered = true;
  }

  const hasInvalidLunchWindow = validateSalaryConfig(config, (key) => key).some(
    (issue) => issue.field === "workTime",
  );
  if (hasInvalidLunchWindow) {
    config.lunchStart = defaultSalaryConfig.lunchStart;
    config.lunchEnd = defaultSalaryConfig.lunchEnd;
    config.enableLunchBreak = defaultSalaryConfig.enableLunchBreak;
    recovered = true;
  }

  // Mirrors the lunch-window repair: the toggle cannot stay on without a phase to alternate from,
  // and a migration has no clock to align with. Switching it off leaves a config that validates
  // again, and switching it back on writes the week the user is in.
  if (config.bigWeekEnabled && !parseDateKey(config.bigWeekAnchor)) {
    config.bigWeekEnabled = false;
    recovered = true;
  }

  return {
    config,
    ...(recovered ? { recoveryReason: "invalid-values" as const } : {}),
  };
}

export function recoverVersionedSalaryConfig({
  config,
  schemaVersion,
}: VersionedSalaryConfigInput): RecoveredSalaryConfig {
  const savedConfig = asPartialConfig(config);

  if (
    typeof schemaVersion === "number" &&
    Number.isFinite(schemaVersion) &&
    schemaVersion > settingsSchemaVersion
  ) {
    const normalized = normalizeSalaryConfig(
      savedConfig,
      config !== undefined && !savedConfig,
    );
    return {
      config: normalized.config,
      recoveryReason: "future-schema",
    };
  }

  let migratedConfig: unknown = config;
  let currentVersion =
    typeof schemaVersion === "number" && Number.isFinite(schemaVersion)
      ? Math.max(1, Math.floor(schemaVersion))
      : 1;

  while (currentVersion < settingsSchemaVersion) {
    const migrate = settingsMigrations[currentVersion];
    migratedConfig = migrate ? migrate(migratedConfig) : migratedConfig;
    currentVersion += 1;
  }

  return normalizeSalaryConfig(
    asPartialConfig(migratedConfig),
    config !== undefined && !savedConfig,
  );
}

export function migrateVersionedSalaryConfig(
  input: VersionedSalaryConfigInput,
): SalaryConfig {
  return recoverVersionedSalaryConfig(input).config;
}

export function migrateSalaryConfig(
  savedConfig: PersistedSalaryConfig,
  savedSettingsVersion?: number,
): SalaryConfig {
  return migrateVersionedSalaryConfig({
    config: savedConfig,
    schemaVersion: savedSettingsVersion,
  });
}

export function resolveOnboardingState(
  savedConfig: PersistedSalaryConfig,
  savedHasCompletedOnboarding: boolean | undefined,
) {
  if (typeof savedHasCompletedOnboarding === "boolean") {
    return savedHasCompletedOnboarding;
  }

  return Boolean(savedConfig);
}
