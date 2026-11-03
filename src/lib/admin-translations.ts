import { isValidLocalizedText, type Lang } from "./content";

export const CONTENT_LANGUAGES = ["sr", "en", "ru"] as const;
export const CONTENT_SUFFIX = { sr: "Sr", en: "En", ru: "Ru" } as const;

export type TranslationEntry = {
  key: string;
  sr: string;
  en: string;
  ru: string;
  required?: boolean;
};

export type TranslationIssue = {
  language: Lang;
  key: string;
  reason: "missing" | "invalid";
};

export function translationIssues(
  entries: TranslationEntry[],
): TranslationIssue[] {
  return CONTENT_LANGUAGES.flatMap((language) =>
    entries.flatMap<TranslationIssue>((entry) => {
      const active =
        entry.required || CONTENT_LANGUAGES.some((lang) => entry[lang].trim());
      if (!active) return [];
      const value = entry[language].trim();
      if (!value)
        return [{ language, key: entry.key, reason: "missing" as const }];
      return isValidLocalizedText(value, language)
        ? []
        : [{ language, key: entry.key, reason: "invalid" as const }];
    }),
  );
}

export function contentLanguageName(language: Lang, uiLanguage: "sr" | "en") {
  return {
    sr: { sr: "Српски · ћирилица", en: "Serbian · Cyrillic" },
    en: { sr: "Енглески", en: "English" },
    ru: { sr: "Руски · ћирилица", en: "Russian · Cyrillic" },
  }[language][uiLanguage];
}
