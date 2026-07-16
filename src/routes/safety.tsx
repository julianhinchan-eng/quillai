import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Lock, KeyRound, ServerCog, Database, Cpu } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Sicherheit · Security — QuillAI" },
      { name: "description", content: "Wie QuillAI deine Daten, Prompts, Dokumente und Bilder durch TLS-Verschlüsselung und serverseitige Secrets schützt." },
      { property: "og:title", content: "Sicherheit · Security — QuillAI" },
      { property: "og:description", content: "TLS, server-side secrets and least-privilege access — how QuillAI keeps your data safe." },
    ],
  }),
  component: SafetyPage,
});

function FeatureCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-7">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function SafetyPage() {
  const { lang, setLang } = useI18n();
  const de = lang === "de";
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-4xl mx-auto w-full">
        <Link to="/" className="text-xl font-semibold tracking-tight">quillai.online</Link>
        <div className="flex items-center gap-3 text-sm">
          <button onClick={() => setLang("de")} className={`hover:text-foreground ${de ? "text-foreground font-medium" : "text-muted-foreground"}`}>DE</button>
          <span className="text-muted-foreground">·</span>
          <button onClick={() => setLang("en")} className={`hover:text-foreground ${!de ? "text-foreground font-medium" : "text-muted-foreground"}`}>EN</button>
          <Link to="/auth" className="ml-3 text-muted-foreground hover:text-foreground">{de ? "Einloggen" : "Log In"}</Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-muted-foreground mb-6">
            <ShieldCheck className="h-4 w-4" />
            {de ? "Sicherheit & Vertrauen" : "Security & Trust"}
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] text-foreground">
            {de ? "Sicherheit bei QuillAI" : "Security at QuillAI"}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            {de
              ? "QuillAI ist eine reine KI-Anwendung. So schützen wir deine Eingaben, hochgeladenen Dateien und Konto-Daten – auf jeder Ebene des Stacks."
              : "QuillAI is a pure AI application. Here is how we protect your inputs, uploaded files and account data – at every layer of the stack."}
          </p>

          <div className="mt-12 space-y-6">
            <FeatureCard icon={Lock} title={de ? "TLS / SSL-Verschlüsselung in der Übertragung" : "TLS / SSL Encryption in Transit"}>
              <p>
                {de
                  ? "Jede einzelne Verbindung zu QuillAI – die Anmeldung, dein Chat, der Datei-Upload, der Aufruf der KI – läuft ausschließlich über HTTPS mit moderner TLS-Verschlüsselung (TLS 1.2 / 1.3). Prompts, hochgeladene PDFs/DOCX/TXT/CSV sowie Bilder werden auf dem Weg zwischen deinem Browser, unserem Edge-Server und dem KI-Anbieter verschlüsselt übertragen."
                  : "Every single connection to QuillAI – sign-in, chat, file upload, the AI request – runs exclusively over HTTPS with modern TLS encryption (TLS 1.2 / 1.3). Prompts, uploaded PDFs/DOCX/TXT/CSV and images are transmitted encrypted between your browser, our edge server and the AI provider."}
              </p>
              <p>
                {de
                  ? "Es gibt keine unverschlüsselten HTTP-Endpunkte. Cookies werden mit den Flags Secure und HttpOnly gesetzt."
                  : "There are no unencrypted HTTP endpoints. Cookies are set with the Secure and HttpOnly flags."}
              </p>
            </FeatureCard>

            <FeatureCard icon={KeyRound} title={de ? "Server-seitige Secrets (API-Keys)" : "Server-Side Secrets (API Keys)"}>
              <p>
                {de
                  ? "Der Schlüssel für unseren KI-Dienstleister (LOVABLE_API_KEY für das Lovable AI Gateway, das die Google-Gemini-Modelle ansteuert) wird ausschließlich serverseitig in geschützten Edge Functions / Server Functions verwendet. Er ist niemals im Frontend-Bundle, niemals im Browser, niemals in HTML, JS oder Netzwerkanfragen für Dritte einsehbar."
                  : "The key for our AI provider (LOVABLE_API_KEY for the Lovable AI Gateway, which calls the Google Gemini models) is used exclusively server-side inside protected edge functions / server functions. It is never bundled into the frontend, never exposed in the browser, and never visible to third parties in HTML, JS or network requests."}
              </p>
              <p>
                {de
                  ? "Auch PayPal- und Datenbank-Schlüssel (Service-Role) liegen ausschließlich in Server-Secrets und sind aus dem Browser nicht erreichbar."
                  : "PayPal credentials and the database service-role key are likewise stored exclusively as server secrets and are not reachable from the browser."}
              </p>
            </FeatureCard>

            <FeatureCard icon={ServerCog} title={de ? "Trennung Client / Server" : "Client / Server Separation"}>
              <p>
                {de
                  ? "KI-Aufrufe, Zahlungs-Webhooks und alle Schreibvorgänge in der Datenbank laufen in serverseitigen Funktionen. Der Browser bekommt nur einen öffentlichen, eingeschränkten Datenbank-Key (Publishable Key) und ist damit über Row-Level-Security (RLS) gezwungen, ausschließlich auf eigene Daten zuzugreifen."
                  : "AI calls, payment webhooks and all database writes run inside server-side functions. The browser only receives a public, restricted database key (publishable key) and is forced by Row-Level-Security (RLS) to access only its own data."}
              </p>
            </FeatureCard>

            <FeatureCard icon={Database} title={de ? "Row-Level-Security & Datenisolation" : "Row-Level Security & Data Isolation"}>
              <p>
                {de
                  ? "Jede Datenbankzeile ist über RLS-Richtlinien an deine Nutzer-ID gebunden. Ein anderer Nutzer kann deinen Chatverlauf oder dein Abo grundsätzlich nicht lesen, kopieren oder verändern – selbst dann nicht, wenn er versuchen würde, die Anfragen manuell abzusetzen."
                  : "Every database row is bound to your user ID via RLS policies. Another user fundamentally cannot read, copy or modify your chat history or subscription – not even by hand-crafting requests."}
              </p>
            </FeatureCard>

            <FeatureCard icon={Cpu} title={de ? "KI-Anbieter & Kein Training" : "AI Provider & No Training"}>
              <p>
                {de
                  ? "Wir verarbeiten deine Eingaben über das Lovable AI Gateway, das Google-Gemini-Modelle anspricht. Gemäß den offiziellen API-Richtlinien werden Inhalte, die über die API gesendet werden, NICHT zum Training neuer KI-Modelle verwendet."
                  : "We process your inputs through the Lovable AI Gateway, which calls Google Gemini models. Per the official API policies, content sent through the API is NOT used to train new AI models."}
              </p>
            </FeatureCard>

            <FeatureCard icon={ShieldCheck} title={de ? "Verantwortungsteilung" : "Shared Responsibility"}>
              <p>
                {de
                  ? "Diese Seite wird vom App-Betreiber gepflegt und beschreibt aktivierte technische Maßnahmen. Sie ist keine externe Zertifizierung und kein Audit-Bericht. Du selbst bist für ein sicheres Passwort, den Schutz deines Geräts und die rechtmäßige Verwendung der KI verantwortlich."
                  : "This page is maintained by the app owner and describes enabled technical controls. It is not an independent certification or audit report. You are responsible for using a strong password, securing your device and using the AI lawfully."}
              </p>
            </FeatureCard>
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {de ? "QuillAI ausprobieren" : "Try QuillAI"}
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground underline-offset-4 hover:underline">{de ? "Datenschutz" : "Privacy"}</Link>
            <Link to="/terms" className="hover:text-foreground underline-offset-4 hover:underline">{de ? "Nutzungsbedingungen" : "Terms"}</Link>
            <Link to="/" className="hover:text-foreground underline-offset-4 hover:underline">{de ? "Zur Startseite" : "Back to home"}</Link>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        QuillAI · {de ? "Dein KI-Assistent" : "Your AI assistant"}
      </footer>
    </div>
  );
}
