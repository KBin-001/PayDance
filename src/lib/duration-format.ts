// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

export function formatDashboardDuration(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "0m 00s";

  const totalSeconds = Math.floor(ms / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  if (hours <= 0) return `${minutes}m ${seconds}s`;

  return `${hours}h ${minutes}m ${seconds}s`;
}
