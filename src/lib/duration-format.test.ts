// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import { describe, expect, it } from "vitest";
import { formatDashboardDuration } from "./duration-format";

describe("dashboard duration format", () => {
  it("shows padded seconds in dashboard durations", () => {
    expect(formatDashboardDuration(Number.NaN)).toBe("0m 00s");
    expect(formatDashboardDuration(0)).toBe("0m 00s");
    expect(formatDashboardDuration(5 * 60_000)).toBe("5m 00s");
    expect(formatDashboardDuration(59 * 60_000 + 7_000)).toBe("59m 07s");
    expect(formatDashboardDuration(3 * 60 * 60_000)).toBe("3h 0m 00s");
    expect(formatDashboardDuration(4 * 60 * 60_000 + 12 * 60_000 + 33_000)).toBe(
      "4h 12m 33s",
    );
  });

  it("floors partial seconds so the dashboard never jumps ahead", () => {
    expect(formatDashboardDuration(4 * 60 * 60_000 + 12 * 60_000 + 59_999)).toBe(
      "4h 12m 59s",
    );
  });
});
