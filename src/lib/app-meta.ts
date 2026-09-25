// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

export const appName = "薪跳";
export const appEnglishName = "PayDance";
export const appTagline = "桌面实时工资看板";
export const appVersion = __PAYDANCE_VERSION__;
export const appDisplayVersion = `V${appVersion.replace(/\.0$/, "")}`;
export const appAuthor = "kbin";
export const appCopyright = "© 2026 kbin";
export const repositoryUrl = "https://github.com/KBin-001/PayDance";
// Set by vite.config.ts: on Vercel it is the /download/windows endpoint (api/download-windows.js),
// which redirects to the newest versioned EXE; other builds link to the Release page.
export const windowsDownloadUrl = __PAYDANCE_WINDOWS_DOWNLOAD_URL__;
