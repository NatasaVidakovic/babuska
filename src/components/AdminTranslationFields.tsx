import { useId } from "react";
import { adminText, type AdminLanguage } from "../lib/admin-i18n";
import {
  CONTENT_LANGUAGES,
  contentLanguageName,
  translationIssues,
  type TranslationEntry,
} from "../lib/admin-translations";
import { isValidLocalizedText, type Lang } from "../lib/content";

export function TranslationSummary({
  entries,
  language,
  compact = false,
}: {
  entries: TranslationEntry[];
  language: AdminLanguage;
  compact?: boolean;
}) {
  const issues = translationIssues(entries);
  const tr = (sr: string, en: string) => adminText(language, sr, en);
  return (
    <div
      className={
        compact ? "admin-translation-badges" : "admin-translation-summary"
      }
    >
      {!compact && (
        <strong>
          {tr("Преводи на једном мјесту", "All translations in one place")}
        </strong>
      )}
      <div className="admin-translation-badges">
        {CONTENT_LANGUAGES.map((lang) => {
          const missing = issues.filter((issue) => issue.language === lang);
          return (
            <span
              key={lang}
              className="admin-translation-badge"
              data-complete={!missing.length}
              title={
                missing.length
                  ? missing.map((issue) => issue.key).join(", ")
                  : tr("Сва поља су попуњена", "All fields are complete")
              }
            >
              {lang.toUpperCase()}{" "}
              {missing.length
                ? `· ${tr("допунити", "incomplete")} (${missing.length})`
                : `✓ ${tr("спремно", "ready")}`}
            </span>
          );
        })}
      </div>
      {!compact && (
        <p>
          {tr(
            "Сва три језика су приказана испод. Празни преводи се покушавају аутоматски допунити при чувању. Ставка без назива није видљива на том језику.",
            "All three languages are shown below. Missing translations are filled automatically when possible on save. An item without a name is hidden in that language.",
          )}
        </p>
      )}
    </div>
  );
}

export function TranslatedField({
  label,
  hint,
  value,
  onChange,
  language,
  required = false,
  multiline = false,
}: {
  label: string;
  hint?: string;
  value: Pick<TranslationEntry, Lang>;
  onChange: (language: Lang, value: string) => void;
  language: AdminLanguage;
  required?: boolean;
  multiline?: boolean;
}) {
  const id = useId();
  const tr = (sr: string, en: string) => adminText(language, sr, en);
  const active =
    required || CONTENT_LANGUAGES.some((lang) => value[lang].trim());
  return (
    <fieldset className="admin-translated-field">
      <legend>
        {label}{" "}
        <span>
          {required
            ? tr("обавезно на српском", "Required in Serbian")
            : tr("необавезно", "optional")}
        </span>
      </legend>
      {hint && <p className="admin-translated-field__hint">{hint}</p>}
      {CONTENT_LANGUAGES.map((lang) => {
        const invalid =
          !!value[lang].trim() && !isValidLocalizedText(value[lang], lang);
        const missing = active && !value[lang].trim();
        const message = invalid
          ? tr("Унесите текст ћирилицом.", "Enter text in Cyrillic.")
          : missing
            ? lang === "sr" && required
              ? tr("Унесите назив.", "Enter a name.")
              : tr("Недостаје превод", "Translation missing")
            : "";
        const props = {
          id: `${id}-${lang}`,
          lang,
          className: `admin-input${multiline ? " admin-textarea" : ""}`,
          value: value[lang],
          required: required && lang === "sr",
          "aria-invalid": invalid || undefined,
          "aria-describedby": message ? `${id}-${lang}-hint` : undefined,
          "data-incomplete": missing || undefined,
          onChange: (
            event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
          ) => onChange(lang, event.target.value),
        };
        return (
          <div className="admin-translated-field__row" key={lang}>
            <label htmlFor={props.id}>
              {contentLanguageName(lang, language)}
            </label>
            {multiline ? (
              <textarea {...props} rows={2} />
            ) : (
              <input {...props} />
            )}
            {message && (
              <small id={`${id}-${lang}-hint`} data-invalid={invalid}>
                {message}
              </small>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
