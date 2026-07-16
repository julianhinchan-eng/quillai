import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Nutzungsbedingungen · Terms — QuillAI" },
      { name: "description", content: "Nutzungsbedingungen für QuillAI – KI-Chat, Bildgenerierung und Dokumenten-/Bildanalyse." },
      { property: "og:title", content: "Nutzungsbedingungen · Terms — QuillAI" },
      { property: "og:description", content: "Rules, rights and obligations when using QuillAI." },
    ],
  }),
  component: TermsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-7 space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-4 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

function TermsPage() {
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
            <FileText className="h-4 w-4" />
            {de ? "Rechtliches" : "Legal"}
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] text-foreground">
            {de ? "Nutzungsbedingungen" : "Terms of Service"}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            {de
              ? "Diese Bedingungen regeln die Nutzung von QuillAI – einer reinen KI-Anwendung für Text-Chat, Bildgenerierung und Dokumenten-/Bildanalyse. Mit der Registrierung erkennst du sie an."
              : "These Terms govern the use of QuillAI — a pure AI application for text chat, image generation and document/image analysis. By creating an account, you accept these rules."}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{de ? "Stand: Juni 2026" : "Last updated: June 2026"}</p>


          <div className="mt-12 space-y-6">
            <Section title={de ? "1. Geltungsbereich & Account" : "1. Scope & Account"}>
              <p>
                {de
                  ? "Diese Nutzungsbedingungen gelten für alle Nutzer von QuillAI. Für die Nutzung ist ein persönlicher Account (E-Mail + Passwort) erforderlich. Du musst mindestens 16 Jahre alt sein, wahrheitsgemäße Angaben machen und dein Passwort sicher aufbewahren. Pro Person ist nur ein Account zulässig."
                  : "These Terms of Service apply to all users of QuillAI. A personal account (e-mail + password) is required. You must be at least 16 years old, provide truthful information and keep your password secure. Only one account per person is allowed."}
              </p>
            </Section>

            <Section title={de ? "2. Eigentum an erzeugten Inhalten" : "2. Ownership of Generated Content"}>
              <p>
                {de
                  ? "Alle Inhalte, die QuillAI für dich erzeugt – also generierte Texte sowie KI-generierte Bilder – gehören vollständig dir. Du darfst sie privat und kommerziell nutzen, weiterverarbeiten, veröffentlichen und verkaufen, soweit dem keine Rechte Dritter (z. B. Marken-, Persönlichkeits- oder Urheberrechte) entgegenstehen."
                  : "All content QuillAI produces for you – generated texts as well as AI-generated images – belongs entirely to you. You may use it privately and commercially, modify, publish and sell it, as long as no third-party rights (e.g. trademark, personality or copyright) are infringed."}
              </p>
              <p>
                {de
                  ? "QuillAI beansprucht keine Eigentums- oder Nutzungsrechte an deinen Ergebnissen. Die generative KI kann allerdings ähnliche Ergebnisse für andere Nutzer erzeugen; ein Exklusivrecht an einer Ausgabe entsteht nicht."
                  : "QuillAI does not claim any ownership or usage rights to your outputs. Note that generative AI may produce similar results for other users; no exclusive right to a specific output is created."}
              </p>
            </Section>

            <Section title={de ? "3. Verbotene Nutzung der KI" : "3. Prohibited Use of the AI"}>
              <p>
                {de
                  ? "Die folgenden Nutzungen sind ausdrücklich untersagt. Bei Verstoß wird der API-/Service-Zugang sofort und ohne Vorwarnung gesperrt; der zuständige KI-Anbieter (Lovable AI Gateway / Google) wird informiert."
                  : "The following uses are expressly prohibited. In case of violation, API/service access will be revoked immediately and without prior notice; the upstream AI provider (Lovable AI Gateway / Google) will be notified."}
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>{de ? "Erstellung illegaler Inhalte (z. B. CSAM, Drogenrezepte, Anleitungen zu Waffen- oder Sprengstoffbau)" : "Creation of illegal content (e.g. CSAM, drug recipes, instructions for weapons or explosives)"}</li>
                <li>{de ? "Sexuell explizite Darstellungen von Minderjährigen oder nicht einwilligungsfähigen Personen – auch nicht mit dem NSFW-fähigen Bildmodell Lustify V8" : "Sexually explicit depictions of minors or persons unable to consent – including via the NSFW-capable image model Lustify V8"}</li>
                <li>{de ? "Generierung von Schadcode, Malware, Viren, Phishing-Kits oder Exploits" : "Generation of malicious code, malware, viruses, phishing kits or exploits"}</li>
                <li>{de ? "Hassrede, Diskriminierung, Volksverhetzung und gezielte Belästigung" : "Hate speech, discrimination, incitement and targeted harassment"}</li>
                <li>{de ? "Deepfakes oder täuschend echte Bild-/Textimitationen realer Personen ohne deren Einwilligung" : "Deepfakes or deceptively realistic image/text impersonations of real persons without their consent"}</li>
                <li>{de ? "Massenhafte Erzeugung von Desinformation, Spam oder Betrugsinhalten" : "Mass-production of disinformation, spam or fraudulent content"}</li>
                <li>{de ? "Versuche, die Sicherheits- und Inhaltsfilter der KI zu umgehen (Jailbreaks, Prompt-Injection)" : "Attempts to bypass the AI's safety and content filters (jailbreaks, prompt injection)"}</li>
              </ul>
            </Section>

            <Section title={de ? "4. Premium-Abonnement & PayPal" : "4. Premium Subscription & PayPal"}>
              <p>
                {de
                  ? "Der Text-Chat bleibt für alle registrierten Nutzer dauerhaft kostenlos und unbegrenzt. Für Premium-Funktionen stehen zwei monatliche Tarife zur Wahl. Nicht genutzte Inklusiv-Kontingente verfallen am Monatsende."
                  : "Text chat remains permanently free and unlimited for every registered user. Two monthly premium tiers are available. Unused monthly allowances expire at the end of each month."}
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>
                  <strong className="text-foreground">Standard Pro – {de ? "3,90 € / $3.90 pro Monat:" : "€3.90 / $3.90 per month:"}</strong>{" "}
                  {de
                    ? "Unbegrenzter Text-Chat, alle Experten-Modi, Dokumenten- und Bildanalyse sowie bis zu 500 KI-Bilder pro Monat. KI-Videogenerierung ist nicht enthalten."
                    : "Unlimited text chat, all expert modes, document and image analysis and up to 500 AI images per month. AI video generation is not included."}
                </li>
                <li>
                  <strong className="text-foreground">Ultimate Video – {de ? "10,00 € / $10.00 pro Monat:" : "€10.00 / $10.00 per month:"}</strong>{" "}
                  {de
                    ? "Alle Standard-Pro-Leistungen plus bis zu 900 KI-Bilder und 15 KI-Videos pro Monat."
                    : "Everything in Standard Pro plus up to 900 AI images and 15 AI videos per month."}
                </li>
              </ul>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>
                  <strong className="text-foreground">{de ? "Abrechnung:" : "Billing:"}</strong>{" "}
                  {de
                    ? "Monatlich im Voraus über PayPal in der Währung deiner Sprachauswahl (EUR für DE, USD für EN). Das Abo verlängert sich automatisch, bis es gekündigt wird."
                    : "Monthly in advance via PayPal in the currency of your language selection (EUR for DE, USD for EN). The subscription renews automatically until cancelled."}
                </li>
                <li>
                  <strong className="text-foreground">{de ? "Sofortige Freischaltung:" : "Instant unlock:"}</strong>{" "}
                  {de
                    ? "Nach erfolgreicher PayPal-Bestätigung werden Bildgenerierung und Datei-/Bildanalyse unmittelbar verfügbar."
                    : "Once PayPal confirms the payment, image generation and document/image analysis become available immediately."}
                </li>
                <li>
                  <strong className="text-foreground">{de ? "Tarifwechsel:" : "Plan change:"}</strong>{" "}
                  {de
                    ? "Ein Wechsel zwischen Standard Pro und Ultimate Video ist jederzeit in den Einstellungen möglich. Der neue Tarif wird sofort freigeschaltet; der alte Tarif endet zur nächsten Abrechnungsperiode."
                    : "You may switch between Standard Pro and Ultimate Video at any time in the settings. The new tier is unlocked immediately; the previous tier ends at the next billing period."}
                </li>
                <li>
                  <strong className="text-foreground">{de ? "Kündigung:" : "Cancellation:"}</strong>{" "}
                  {de
                    ? "Jederzeit mit einem Klick in den Einstellungen. Premium-Funktionen bleiben bis zum Ende der laufenden Abrechnungsperiode aktiv. Bereits gezahlte Beträge werden nicht anteilig erstattet."
                    : "Anytime with one click in the settings. Premium features remain active until the end of the current billing period. Already paid amounts are not refunded pro-rata."}
                </li>
                <li>
                  <strong className="text-foreground">{de ? "Automatische Kündigung bei Kontolöschung:" : "Auto-cancel on account deletion:"}</strong>{" "}
                  {de
                    ? "Wenn du dein Konto in der Gefahrenzone löschst, wird ein aktives Premium-Abo automatisch beendet. Es entstehen keine weiteren Kosten."
                    : "If you delete your account in the Danger Zone, an active premium subscription is automatically cancelled. No further charges apply."}
                </li>
              </ul>
            </Section>

            <Section title={de ? "5. Eingesetzte KI-Modelle & Drittanbieter" : "5. AI Models & Third-Party Providers"}>
              <p>
                {de
                  ? "QuillAI kombiniert mehrere spezialisierte KI-Modelle. Deine Eingaben und Anhänge werden zur Verarbeitung an den jeweils zuständigen Anbieter weitergegeben; dort gelten deren Nutzungs- und Datenschutzbedingungen. Die Auswahl kann sich weiterentwickeln, ohne dass diese Bedingungen jedes Mal angepasst werden."
                  : "QuillAI combines several specialized AI models. Your prompts and attachments are forwarded to the respective provider for processing; their terms and privacy policies apply. The selection may evolve without these terms being updated every time."}
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>{de ? "Text-Chat & Bild-/Dokumentenanalyse: Google Gemini 2.5 Flash über den Lovable AI Gateway." : "Text chat & image/document analysis: Google Gemini 2.5 Flash via the Lovable AI Gateway."}</li>
                <li>{de ? "Bildgenerierung/-bearbeitung: Google Gemini 2.5 Flash Image (Standard, über Lovable AI Gateway), FLUX.1 Schnell (Together AI) und Lustify V8 – ein SDXL-Checkpoint mit NSFW-Fähigkeit über die Civitai Orchestration API." : "Image generation/editing: Google Gemini 2.5 Flash Image (default, via Lovable AI Gateway), FLUX.1 Schnell (Together AI) and Lustify V8 – an SDXL checkpoint with NSFW capability via the Civitai Orchestration API."}</li>
                <li>{de ? "Videogenerierung: Runway Veo 3.1 Fast (Text-zu-Video) und Runway gen4_turbo (Bild-zu-Video)." : "Video generation: Runway Veo 3.1 Fast (text-to-video) and Runway gen4_turbo (image-to-video)."}</li>
                <li>{de ? "3D-Modelle: Tripo3D v3.0." : "3D models: Tripo3D v3.0."}</li>
                <li>{de ? "Voice-Chat: OpenAI GPT-4o mini Realtime." : "Voice chat: OpenAI GPT-4o mini Realtime."}</li>
              </ul>
              <p>
                {de
                  ? "Lustify V8 ist ein Community-SDXL-Modell mit reduzierten Inhaltsfiltern und kann explizite Darstellungen erzeugen. Der Modus ist unabhängig vom PayPal-Abo und wird ausschließlich über ein separates Krypto-Guthaben (NOWPayments, u. a. BTC / ETH / USDC) abgerechnet – 0,05 € pro Bild. Standard/Ultimate-Abos enthalten keine Lustify-Bilder. Die Nutzung ist nur eingeloggten Nutzerinnen und Nutzern mit ausreichendem Lustify-Guthaben gestattet und darf ausschließlich für einvernehmliche, erwachsene Darstellungen erfolgen. Alle in Abschnitt 3 genannten Verbote (insbesondere CSAM, nicht einwilligende Personen, Deepfakes realer Menschen) gelten uneingeschränkt und werden durch das freizügigere Modell nicht aufgehoben."
                  : "Lustify V8 is a community SDXL model with reduced content filters and can produce explicit output. The mode is independent from the PayPal subscription and is billed exclusively through a separate crypto balance (NOWPayments, incl. BTC / ETH / USDC) – 0.05 € per image. Standard/Ultimate subscriptions do not include any Lustify images. Use is restricted to signed-in users with sufficient Lustify credit and only for consensual, adult depictions. All prohibitions in section 3 (in particular CSAM, non-consenting persons, deepfakes of real people) apply without exception and are not lifted by the more permissive model."}
              </p>
            </Section>

            <Section title={de ? "6. Verfügbarkeit & Haftung" : "6. Availability & Liability"}>
              <p>
                {de
                  ? "Wir bemühen uns um eine hohe Verfügbarkeit, können diese aber nicht garantieren. QuillAI ist von Drittdiensten (Lovable AI Gateway, Google Gemini, Together AI, Civitai, Runway, Tripo3D, OpenAI) abhängig; deren Ausfälle können den Service vorübergehend beeinträchtigen. KI-Antworten und -Bilder können fehlerhaft, unvollständig oder unpassend sein – bitte überprüfe wichtige Informationen eigenverantwortlich."
                  : "We aim for high availability but cannot guarantee it. QuillAI depends on third-party services (Lovable AI Gateway, Google Gemini, Together AI, Civitai, Runway, Tripo3D, OpenAI); their outages may temporarily affect the service. AI responses and images may be incorrect, incomplete or unsuitable – please verify important information yourself."}
              </p>
              <p>
                {de
                  ? "Eine Haftung für leichte Fahrlässigkeit ist im gesetzlich zulässigen Rahmen ausgeschlossen. Die Haftung für Vorsatz, grobe Fahrlässigkeit und nach dem Produkthaftungsgesetz bleibt unberührt."
                  : "Liability for slight negligence is excluded to the extent permitted by law. Liability for intent, gross negligence and under the Product Liability Act remains unaffected."}
              </p>
            </Section>

            <Section title={de ? "7. Änderungen & Schlussbestimmungen" : "7. Changes & Final Provisions"}>
              <p>
                {de
                  ? "Wir können diese Bedingungen anpassen, wenn sich Funktionen oder rechtliche Anforderungen ändern. Wesentliche Änderungen kündigen wir per E-Mail oder im Service an. Es gilt deutsches Recht. Sollte eine Bestimmung unwirksam sein, bleibt die Wirksamkeit der übrigen Regelungen unberührt."
                  : "We may update these Terms when functionality or legal requirements change. We will announce material changes by e-mail or within the service. German law applies. Should any provision be invalid, the validity of the remaining provisions remains unaffected."}
              </p>
            </Section>
          </div>

          <div className="mt-12 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground underline-offset-4 hover:underline">{de ? "Datenschutz" : "Privacy"}</Link>
            <Link to="/safety" className="hover:text-foreground underline-offset-4 hover:underline">{de ? "Sicherheit" : "Security"}</Link>
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
