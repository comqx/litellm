import i18n, { type InitOptions } from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
  }
}

const options: InitOptions = {
  lng: "zh-CN",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  resources: {
    en: { translation: en },
    "zh-CN": { translation: zhCN as typeof en },
  },
  initAsync: false,
};

void i18n.use(initReactI18next).init(options);

export default i18n;
