import type { InitOptions } from 'i18next';
import type { Theme, Components } from '@mui/material/styles';

import resourcesToBackend from 'i18next-resources-to-backend';

// MUI Core Locales
import { elGR as elGRCore } from '@mui/material/locale';
// MUI Date Pickers Locales
import { enUS as enUSDate } from '@mui/x-date-pickers/locales';
// MUI Data Grid Locales
import { enUS as enUSDataGrid, elGR as elGRDataGrid } from '@mui/x-data-grid/locales';

// ----------------------------------------------------------------------

// Supported languages
export const supportedLngs = ['el', 'en'] as const;
export type LangCode = (typeof supportedLngs)[number];

// Fallback and default namespace
export const fallbackLng: LangCode = 'el';
export const defaultNS = 'common';

// Available namespaces
export const namespaces = [
  'common',
  'messages',
  'api',
  'dashboard',
  'field',
  'navbar',
  'docs',
] as const;

// Storage config
export const storageConfig = {
  cookie: { key: 'i18next', autoDetection: false },
  localStorage: { key: 'i18nextLng', autoDetection: false },
} as const;

// ----------------------------------------------------------------------

/**
 * @countryCode https://flagcdn.com/en/codes.json
 * @adapterLocale https://github.com/iamkun/dayjs/tree/master/src/locale
 * @numberFormat https://simplelocalize.io/data/locales/
 */

export type LangOption = {
  value: LangCode;
  label: string;
  countryCode: string;
  adapterLocale?: string;
  numberFormat: { code: string; currency: string };
  systemValue?: { components: Components<Theme> };
};

export const allLangs: LangOption[] = [
  {
    value: 'el',
    label: 'Greek',
    countryCode: 'GR',
    adapterLocale: 'el',
    numberFormat: { code: 'el-GR', currency: 'EUR' },
    systemValue: {
      components: { ...elGRCore.components, ...elGRDataGrid.components },
    },
  },
  {
    value: 'en',
    label: 'English',
    countryCode: 'GB',
    adapterLocale: 'en',
    numberFormat: { code: 'en-US', currency: 'EUR' },
    systemValue: {
      components: { ...enUSDate.components, ...enUSDataGrid.components } as any,
    },
  },
];

// ----------------------------------------------------------------------

export const i18nResourceLoader = resourcesToBackend(
  (lang: LangCode, namespace: string) => import(`./langs/${lang}/${namespace}.json`)
);

export function i18nOptions(lang = fallbackLng, namespace = defaultNS): InitOptions {
  return {
    // debug: true,
    supportedLngs,
    fallbackLng,
    lng: lang,
    /********/
    fallbackNS: defaultNS,
    defaultNS,
    ns: namespace,
  };
}

export function getCurrentLang(lang?: string): LangOption {
  const fallbackLang = allLangs.find((l) => l.value === fallbackLng) ?? allLangs[0];

  if (!lang) {
    return fallbackLang;
  }

  return allLangs.find((l) => l.value === lang) ?? fallbackLang;
}
