import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Datenschutz · Privacy — QuillAI" },
      { name: "description", content: "Wie QuillAI personenbezogene Daten unter der DSGVO erhebt, verarbeitet und schützt." },
      { property: "og:title", content: "Datenschutz · Privacy — QuillAI" },
      { property: "og:description", content: "How QuillAI collects, processes and protects your personal data under the GDPR." },
    ],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-7 space-y-5">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-5 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold tracking-tight text-foreground mt-2">{children}</h3>;
}

function PrivacyPage() {
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
            <Lock className="h-4 w-4" />
            {de ? "Rechtliches" : "Legal"}
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1] text-foreground">
            {de ? "Datenschutzerklärung" : "Privacy Policy"}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            {de
              ? "Wie QuillAI personenbezogene Daten erhebt, verarbeitet und schützt — als reine KI-Anwendung."
              : "How QuillAI collects, processes and safeguards your personal data — as a pure AI application."}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{de ? "Stand: Juli 2026" : "Last updated: July 2026"}</p>

          <div className="mt-12 space-y-6">
            <Section title={de ? "1. Datenminimierung" : "1. Data Minimization"}>
              <p>
                {de
                  ? "QuillAI ist eine reine KI-Anwendung. Wir erheben KEINE öffentlichen Benutzerprofile, KEINE Anzeigenamen, KEINE Bios und KEINE Social-Media-Daten. Für die Account-Verwaltung verarbeiten wir ausschließlich deine E-Mail-Adresse sowie ein gehashtes Passwort. Ein interner Benutzername wird automatisch aus dem E-Mail-Präfix generiert und ist für andere Nutzer nicht sichtbar."
                  : "QuillAI is a pure AI application. We do NOT collect public user profiles, display names, bios or any social-media data. For account management we only process your e-mail address and a hashed password. An internal username is generated automatically from the e-mail prefix and is not visible to other users."}
              </p>
              <p>
                {de
                  ? "Rechtsgrundlage: Art. 6(1)(b) DSGVO (Vertragserfüllung)."
                  : "Legal basis: Art. 6(1)(b) GDPR (performance of a contract)."}
              </p>
            </Section>

            <Section title={de ? "1a. Anmeldung mit Google (OAuth)" : "1a. Sign-in with Google (OAuth)"}>
              <p>
                {de
                  ? "Zusätzlich zur E-Mail-/Passwort-Anmeldung bieten wir die Anmeldung über Google an. Verantwortlich für den Sign-in-Vorgang ist Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Irland. Wenn du „Mit Google anmelden“ nutzt, wirst du auf eine von Google betriebene Anmeldeseite weitergeleitet."
                  : "In addition to e-mail/password sign-in we offer sign-in with Google. The sign-in flow is operated by Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Ireland. When you use “Sign in with Google” you are redirected to a login page operated by Google."}
              </p>
              <SubHeading>{de ? "Übermittelte Daten" : "Data transmitted"}</SubHeading>
              <p>
                {de
                  ? "Nach erfolgreicher Anmeldung erhalten wir von Google ausschließlich die folgenden Informationen (Scopes openid, email, profile): deine E-Mail-Adresse, eine eindeutige Google-Nutzer-ID sowie – sofern in deinem Google-Konto hinterlegt – deinen Anzeigenamen und dein Profilbild. Wir erhalten KEIN Passwort, KEINE Kontakte und KEINEN Zugriff auf andere Google-Dienste."
                  : "Upon successful sign-in we receive from Google only the following information (scopes openid, email, profile): your e-mail address, a unique Google user ID and — if present in your Google account — your display name and profile picture. We do NOT receive your password, contacts or any access to other Google services."}
              </p>
              <p>
                {de
                  ? "Von diesen Daten speichern wir dauerhaft nur die E-Mail-Adresse und die interne Nutzer-ID. Anzeigename und Profilbild werden nicht öffentlich angezeigt und nicht an Dritte weitergegeben."
                  : "Of these data, we permanently store only the e-mail address and the internal user ID. Display name and profile picture are not shown publicly and are not shared with third parties."}
              </p>
              <SubHeading>{de ? "Auth-Dienstleister" : "Auth service provider"}</SubHeading>
              <p>
                {de
                  ? "Der Anmelde- und Sitzungsdienst (inkl. sicherer Speicherung des Login-Tokens) wird technisch über Supabase (Supabase Inc., USA) im Rahmen der Lovable-Cloud-Infrastruktur bereitgestellt. Datenverarbeitung in der EU; ergänzende Übermittlungen in die USA erfolgen auf Basis der EU-Standardvertragsklauseln (Art. 46 DSGVO)."
                  : "The sign-in and session service (including secure storage of the login token) is technically provided via Supabase (Supabase Inc., USA) as part of the Lovable Cloud infrastructure. Data processing takes place in the EU; supplementary transfers to the USA are based on the EU Standard Contractual Clauses (Art. 46 GDPR)."}
              </p>
              <SubHeading>{de ? "Google als eigenständig Verantwortlicher" : "Google as independent controller"}</SubHeading>
              <p>
                {de
                  ? "Google verarbeitet im Rahmen des Sign-in-Vorgangs eigene Daten (u. a. Cookies, IP-Adresse, Zeitpunkt der Anmeldung) als eigenständig Verantwortlicher. Für diese Verarbeitung gilt die Datenschutzerklärung von Google: "
                  : "During the sign-in flow Google processes its own data (including cookies, IP address, time of sign-in) as an independent controller. Google’s own privacy policy applies to that processing: "}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">policies.google.com/privacy</a>.
              </p>
              <SubHeading>{de ? "Rechtsgrundlage & Widerruf" : "Legal basis & withdrawal"}</SubHeading>
              <p>
                {de
                  ? "Rechtsgrundlage ist Art. 6(1)(b) DSGVO (Vertragserfüllung – Bereitstellung des Accounts) sowie – für den Sign-in-Prozess bei Google – Art. 6(1)(a) DSGVO (Einwilligung, die du bei Google erteilst). Du kannst die Verknüpfung jederzeit widerrufen, indem du dein Konto in den Einstellungen löschst oder den Zugriff in deinem Google-Konto entziehst (myaccount.google.com → Sicherheit → Drittanbieter mit Kontozugriff)."
                  : "The legal basis is Art. 6(1)(b) GDPR (performance of contract – providing your account) and — for the sign-in flow at Google — Art. 6(1)(a) GDPR (consent given to Google). You can revoke the connection at any time by deleting your account in the settings or by revoking access in your Google account (myaccount.google.com → Security → Third-party apps with account access)."}
              </p>
            </Section>

            <Section title={de ? "2. KI-Verarbeitung über das Lovable AI Gateway" : "2. AI Processing via the Lovable AI Gateway"}>
              <p>
                {de
                  ? "Damit QuillAI dir antworten, Bilder generieren oder Dokumente analysieren kann, werden deine Eingaben in Echtzeit an einen KI-Dienstleister übertragen:"
                  : "So that QuillAI can answer you, generate images or analyse documents, your inputs are transmitted in real time to an AI service:"}
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>
                  <strong className="text-foreground">{de ? "Auftragsverarbeiter:" : "Processor:"}</strong>{" "}
                  {de
                    ? "Lovable AI Gateway (Lovable AB, Schweden), das als KI-Routing-Layer fungiert."
                    : "Lovable AI Gateway (Lovable AB, Sweden), acting as the AI routing layer."}
                </li>
                <li>
                  <strong className="text-foreground">{de ? "Sub-Auftragsverarbeiter & Modelle:" : "Sub-processor & models:"}</strong>{" "}
                  Google (Google Ireland Ltd.) — <code className="text-xs">google/gemini-3-flash-preview</code> {de ? "für Text-Chat und Dokumenten-/Bildanalyse" : "for text chat and document/image analysis"}, <code className="text-xs">google/gemini-2.5-flash-image</code> {de ? "für die KI-Bildgenerierung" : "for AI image generation"}.
                </li>
                <li>
                  <strong className="text-foreground">{de ? "Übertragene Daten:" : "Data transmitted:"}</strong>{" "}
                  {de
                    ? "Deine Text-Prompts; bei Premium-Funktionen zusätzlich hochgeladene PDFs, DOCX, TXT, CSV oder Bilder (PNG/JPG); beim Live-Sprachchat dein Mikrofon-Audio in Echtzeit; beim 3D-Kreator dein Text-Prompt bzw. Referenzbild."
                    : "Your text prompts; with premium features additionally uploaded PDFs, DOCX, TXT, CSV or images (PNG/JPG); with the live voice chat your microphone audio in real time; with the 3D creator your text prompt or reference image."}
                </li>
                <li>
                  <strong className="text-foreground">{de ? "Drittlandtransfer:" : "Third-country transfer:"}</strong>{" "}
                  {de
                    ? "Die Verarbeitung kann auf Servern außerhalb der EU stattfinden. Die Übermittlung erfolgt auf Grundlage der EU-Standardvertragsklauseln."
                    : "Processing may take place on servers outside the EU. Transfers are based on the EU Standard Contractual Clauses."}
                </li>
                <li>
                  <strong className="text-foreground">{de ? "Verschlüsselung:" : "Encryption:"}</strong>{" "}
                  {de
                    ? "Alle Übertragungen erfolgen ausschließlich verschlüsselt über TLS/HTTPS."
                    : "All transfers happen exclusively encrypted via TLS/HTTPS."}
                </li>
              </ul>
              <p>
                {de
                  ? "Rechtsgrundlage: Art. 6(1)(b) DSGVO (Vertragserfüllung – Bereitstellung der angefragten KI-Antwort)."
                  : "Legal basis: Art. 6(1)(b) GDPR (performance of contract – delivering the requested AI response)."}
              </p>
            </Section>

            <Section title={de ? "2a. Live-Sprachchat (OpenAI Realtime)" : "2a. Live Voice Chat (OpenAI Realtime)"}>
              <p>
                {de
                  ? "Für die Premium-Funktion »Live-Sprachchat« verwenden wir die Realtime-API von OpenAI, um dein Mikrofon-Audio in Echtzeit zu verarbeiten und eine gesprochene Antwort zurückzuliefern."
                  : "For the premium \"Live Voice Chat\" feature we use OpenAI's Realtime API to process your microphone audio in real time and stream back a spoken response."}
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>
                  <strong className="text-foreground">{de ? "Auftragsverarbeiter:" : "Processor:"}</strong>{" "}
                  OpenAI Ireland Ltd., 1st Floor, The Liffey Trust Centre, 117-126 Sheriff Street Upper, Dublin 1, D01 YC43, Ireland.
                </li>
                <li>
                  <strong className="text-foreground">{de ? "Modell:" : "Model:"}</strong>{" "}
                  <code className="text-xs">gpt-4o-mini-realtime-preview</code>
                </li>
                <li>
                  <strong className="text-foreground">{de ? "Übertragene Daten:" : "Data transmitted:"}</strong>{" "}
                  {de ? "Dein Mikrofon-Audio-Stream sowie deine Prompts." : "Your microphone audio stream and your prompts."}
                </li>
                <li>
                  <strong className="text-foreground">{de ? "Drittlandtransfer:" : "Third-country transfer:"}</strong>{" "}
                  {de
                    ? "Die Verarbeitung kann in den USA stattfinden. Übermittlung auf Grundlage der EU-Standardvertragsklauseln."
                    : "Processing may take place in the USA. Transfers are based on the EU Standard Contractual Clauses."}
                </li>
                <li>
                  <strong className="text-foreground">{de ? "Kein Training:" : "No training:"}</strong>{" "}
                  {de
                    ? "Gemäß den API-Richtlinien von OpenAI werden über die API übertragene Inhalte nicht zum Training verwendet."
                    : "Per OpenAI's API policies, content sent through the API is not used for training."}
                </li>
              </ul>
            </Section>

            <Section title={de ? "2b. 3D-Kreator (Tripo3D)" : "2b. 3D Creator (Tripo3D)"}>
              <p>
                {de
                  ? "Für die Premium-Funktion »3D-Kreator« nutzen wir die API von Tripo3D, um aus deinem Text-Prompt oder einem Referenzbild ein 3D-Modell zu generieren."
                  : "For the premium \"3D Creator\" feature we use the Tripo3D API to generate a 3D model from your text prompt or a reference image."}
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>
                  <strong className="text-foreground">{de ? "Auftragsverarbeiter:" : "Processor:"}</strong>{" "}
                  VAST AI Research (Tripo3D), <code className="text-xs">api.tripo3d.ai</code>.
                </li>
                <li>
                  <strong className="text-foreground">{de ? "Übertragene Daten:" : "Data transmitted:"}</strong>{" "}
                  {de
                    ? "Dein Text-Prompt bzw. hochgeladenes Referenzbild sowie technische Metadaten der Anfrage."
                    : "Your text prompt or uploaded reference image, plus technical request metadata."}
                </li>
                <li>
                  <strong className="text-foreground">{de ? "Drittlandtransfer:" : "Third-country transfer:"}</strong>{" "}
                  {de
                    ? "Die Verarbeitung kann auf Servern außerhalb der EU stattfinden. Übermittlung auf Grundlage der EU-Standardvertragsklauseln."
                    : "Processing may take place on servers outside the EU. Transfers are based on the EU Standard Contractual Clauses."}
                </li>
                <li>
                  <strong className="text-foreground">{de ? "Ergebnis-Speicherung:" : "Result storage:"}</strong>{" "}
                  {de
                    ? "Das generierte 3D-Modell wird als URL in deinem Chatverlauf abgelegt und kann jederzeit über »Konto löschen« entfernt werden."
                    : "The generated 3D model is stored as a URL in your chat history and can be removed at any time via \"Delete account\"."}
                </li>
              </ul>
              <p>{de ? "Rechtsgrundlage: Art. 6(1)(b) DSGVO." : "Legal basis: Art. 6(1)(b) GDPR."}</p>
            </Section>

            <Section title={de ? "3. Kein Modell-Training mit deinen Daten" : "3. No Model Training With Your Data"}>
              <p>
                {de
                  ? "Gemäß den offiziellen Business-/API-Richtlinien des Lovable AI Gateways und des darunterliegenden Anbieters (Google) werden über die API gesendete Prompts, Dokumente und Bilder NICHT zum Training zukünftiger KI-Modelle verwendet. Eingaben dienen ausschließlich der Erzeugung deiner aktuellen Antwort."
                  : "Per the official business/API policies of the Lovable AI Gateway and the underlying provider (Google), prompts, documents and images sent through the API are NOT used to train future AI models. Inputs are used solely to produce your current response."}
              </p>
            </Section>

            <Section title={de ? "4. Speicherung & Datenlöschung" : "4. Storage & Deletion"}>
              <p>
                {de
                  ? "Dein Chatverlauf (Konversationen und Nachrichten) wird in unserer Datenbank gespeichert, um dir die Historie in der Seitenleiste anzuzeigen. Hochgeladene Dokumente/Bilder werden ausschließlich zur Verarbeitung an die KI weitergegeben und nicht dauerhaft auf unseren Servern abgelegt – es bleibt höchstens eine Textextraktion bzw. eine kurzfristige Vorschau im Browser."
                  : "Your chat history (conversations and messages) is stored in our database to show the history in the sidebar. Uploaded documents/images are passed to the AI for processing only and are not stored persistently on our servers — at most a text extract or short-lived preview remains in your browser."}
              </p>
              <p>
                {de
                  ? "Über Einstellungen → Gefahrenzone → »Konto löschen« kannst du jederzeit dein Konto, deinen gesamten Chatverlauf und alle verknüpften Daten unwiderruflich entfernen. Ein aktives Premium-Abo wird im selben Vorgang automatisch gekündigt."
                  : "Via Settings → Danger Zone → \"Delete account\" you can permanently erase your account, your entire chat history and all linked data at any time. An active premium subscription is automatically cancelled in the same step."}
              </p>
            </Section>

            <Section title={de ? "5. Zahlungsabwicklung (PayPal)" : "5. Payment Processing (PayPal)"}>
              <p>
                {de
                  ? "Für das optionale Premium-Abo (10,00 € / $10.00 pro Monat) nutzen wir PayPal (Europe) S.à r.l. et Cie, S.C.A., 22-24 Boulevard Royal, L-2449 Luxembourg. PayPal erhält Transaktions-Metadaten und deine E-Mail. Wir speichern KEINE Kreditkarten- oder Kontodaten auf unseren Servern."
                  : "For the optional premium subscription (€10.00 / $10.00 per month) we use PayPal (Europe) S.à r.l. et Cie, S.C.A., 22-24 Boulevard Royal, L-2449 Luxembourg. PayPal receives transaction metadata and your e-mail. We do NOT store any credit card or bank account data on our servers."}
              </p>
              <p>{de ? "Rechtsgrundlage: Art. 6(1)(b) DSGVO." : "Legal basis: Art. 6(1)(b) GDPR."}</p>
            </Section>

            <Section title={de ? "6. Hosting & Server-Logs" : "6. Hosting & Server Logs"}>
              <p>
                {de
                  ? "Die Anwendung wird auf moderner Cloud-Infrastruktur (Edge-Hosting) betrieben. Aus Sicherheitsgründen werden technische Logfiles (Browsertyp, Zeitpunkt, IP-Adresse) kurzfristig verarbeitet. Diese Daten werden nicht zu Werbezwecken ausgewertet und nicht mit deinem Account verknüpft."
                  : "The application runs on modern cloud infrastructure (edge hosting). For security reasons, technical log files (browser type, timestamp, IP address) are processed short-term. This data is not used for advertising and is not linked to your account."}
              </p>
              <p>{de ? "Rechtsgrundlage: Art. 6(1)(f) DSGVO." : "Legal basis: Art. 6(1)(f) GDPR."}</p>
            </Section>

            <Section title={de ? "7. Deine Rechte" : "7. Your Rights"}>
              <p>
                {de
                  ? "Du hast jederzeit Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie das Recht auf Beschwerde bei einer Aufsichtsbehörde."
                  : "You have the right at any time to information, rectification, erasure, restriction, data portability and objection (Art. 15–21 GDPR), as well as the right to lodge a complaint with a supervisory authority."}
              </p>
            </Section>

            <Section title={de ? "8. Verantwortliche Stelle" : "8. Controller"}>
              <ul className="space-y-1">
                <li>Fabrathan Hinchan</li>
                <li>Hermann-Balk-Straße 88a, 22147 Hamburg, Germany</li>
                <li>E-Mail: digipoint-online@yahoo.com</li>
                <li>Tel.: 040 18009108</li>
                <li>{de ? "Steuernummer:" : "Tax No.:"} 44/096/02741</li>
              </ul>
            </Section>
          </div>

          <div className="mt-12 flex items-center justify-between text-sm text-muted-foreground">
            <Link to="/safety" className="hover:text-foreground underline-offset-4 hover:underline">
              ← {de ? "Sicherheit" : "Security"}
            </Link>
            <Link to="/" className="hover:text-foreground underline-offset-4 hover:underline">
              {de ? "Zur Startseite" : "Back to home"}
            </Link>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground">
        QuillAI · {de ? "Dein KI-Assistent" : "Your AI assistant"}
      </footer>
    </div>
  );
}
