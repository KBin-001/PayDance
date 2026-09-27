// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import { describe, expect, it } from "vitest";
import packageMetadata from "../../package.json";
import {
  appAuthor,
  appCopyright,
  appDisplayVersion,
  appEnglishName,
  appName,
  appTagline,
  appVersion,
  repositoryUrl,
  windowsDownloadUrl,
} from "./app-meta";

describe("app metadata", () => {
  it("uses the PayDance brand without legacy wording", () => {
    expect(appName).toBe("薪跳");
    expect(appEnglishName).toBe("PayDance");
    expect(appTagline).toBe("桌面实时工资看板");
  });

  it("links the GitHub entry point to the project", () => {
    expect(repositoryUrl).toBe("https://github.com/KBin-001/PayDance");
  });

  it("records the product author attribution", () => {
    expect(appAuthor).toBe("kbin");
    expect(appCopyright).toBe("© 2026 kbin");
  });

  it("exposes the current app version for about surfaces", () => {
    expect(appVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(appVersion).toBe(packageMetadata.version);
    expect(appDisplayVersion).toBe("V1.0");
  });

  it("links Windows downloads to the Release page outside Vercel builds", () => {
    expect(windowsDownloadUrl).toBe(
      "https://github.com/KBin-001/PayDance/releases/latest",
    );
  });
});
