<script setup lang="ts">
// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md
import { useI18n } from "../../composables/useI18n";

const { t } = useI18n();
defineProps<{
  appCopyright: string;
  appEnglishName: string;
  appName: string;
}>();
</script>

<template>
  <footer class="web-preview__footer" :aria-label="t('web.footerAriaLabel')">
    <div class="web-preview__footer-credit">
      <span>{{ appCopyright }}</span>
      <span class="web-preview__footer-mark" aria-hidden="true"></span>
      <span>{{ appName }} {{ appEnglishName }}</span>
    </div>
    <a class="web-preview__footer-contact" href="mailto:ypeng9490@gmail.com"
      >ypeng9490@gmail.com</a
    >
  </footer>
</template>
