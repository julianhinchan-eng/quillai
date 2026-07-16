import { useI18n, type Lang } from "@/lib/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();

  const Btn = ({ code, flag, label }: { code: Lang; flag: string; label: string }) => (
    <button
      type="button"
      onClick={() => setLang(code)}
      aria-label={label}
      aria-pressed={lang === code}
      title={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-base leading-none transition-opacity ${
        lang === code ? "opacity-100 ring-1 ring-border bg-secondary" : "opacity-60 hover:opacity-100"
      }`}
    >
      <span aria-hidden>{flag}</span>
    </button>
  );

  return (
    <div
      role="group"
      aria-label={t("lang.label")}
      className={`inline-flex items-center gap-1 ${className}`}
    >
      <Btn code="de" flag="DE" label={t("lang.de")} />
      <Btn code="en" flag="EN" label={t("lang.en")} />
    </div>
  );
}
