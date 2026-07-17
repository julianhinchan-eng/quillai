import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Datenschutz · Privacy — QuillAI" },
      { name: "description", content: "Datenschutzerklärung und Privacy Policy von QuillAI." },
      { property: "og:title", content: "Datenschutz · Privacy — QuillAI" },
      { property: "og:description", content: "Informationen zur Verarbeitung personenbezogener Daten bei QuillAI." },
    ],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-7 space-y-5">
      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-4 text-muted-foreground leading-relaxed break-words">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  const { lang } = useI18n();
  const de = lang === "de";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <Link to="/" className="font-semibold tracking-tight">quillai.online</Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            {de ? "Datenschutz" : "Privacy"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl w-full min-w-0 px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {de ? "Datenschutzerklärung" : "Privacy Policy"}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {de ? "Stand: 17. Juli 2026" : "Last updated: July 17, 2026"}
          </p>
        </div>

        {de ? (
          <>
            <Section title="1. Verantwortlicher">
              <p>
                Verantwortlich für die Datenverarbeitung im Zusammenhang mit QuillAI ist der im Impressum
                genannte Betreiber von quillai.online. Kontaktdaten und ladungsfähige Anschrift entnehmen Sie
                bitte dem Impressum.
              </p>
            </Section>

            <Section title="2. Allgemeines zur Datenverarbeitung">
              <p>
                QuillAI verarbeitet personenbezogene Daten nur, soweit dies für den Betrieb der Website,
                die Bereitstellung von Benutzerkonten, die Erbringung der angebotenen KI-Funktionen,
                die Abwicklung gebuchter Leistungen sowie für Sicherheit und Fehlerbehebung erforderlich ist
                oder eine andere Rechtsgrundlage besteht.
              </p>
              <p>
                Je nach Nutzung können insbesondere Kontodaten, E-Mail-Adresse, technische Verbindungsdaten,
                Nutzungsdaten sowie von Ihnen eingegebene Texte, Prompts und hochgeladene Dateien verarbeitet werden.
              </p>
            </Section>

            <Section title="3. Hosting und Bereitstellung über Netlify">
              <p>
                Die Website und serverseitige Funktionen werden über Netlify bereitgestellt. Beim Aufruf können
                technisch erforderliche Daten wie IP-Adresse, Zeitpunkt des Zugriffs, angeforderte Ressource,
                Browser- und Geräteinformationen sowie technische Protokolldaten verarbeitet werden.
              </p>
              <p>
                Die Verarbeitung dient der sicheren und zuverlässigen Bereitstellung des Dienstes, der Abwehr
                von Missbrauch und der Fehleranalyse. Soweit erforderlich, erfolgt die Verarbeitung auf Grundlage
                von Art. 6 Abs. 1 lit. f DSGVO; bei vertragsbezogener Nutzung zusätzlich auf Grundlage von
                Art. 6 Abs. 1 lit. b DSGVO.
              </p>
            </Section>

            <Section title="4. Benutzerkonten und Supabase">
              <p>
                Für Registrierung, Anmeldung, Sitzungsverwaltung und gegebenenfalls die Speicherung
                anwendungsbezogener Daten nutzt QuillAI Supabase. Dabei können insbesondere E-Mail-Adresse,
                Benutzer-ID, Authentifizierungs- und Sitzungsdaten sowie mit dem Konto verbundene Nutzungsdaten
                verarbeitet werden.
              </p>
              <p>
                Die Verarbeitung erfolgt zur Bereitstellung des Benutzerkontos und der damit verbundenen Funktionen
                gemäß Art. 6 Abs. 1 lit. b DSGVO. Sicherheitsrelevante Protokolldaten können auf Grundlage
                berechtigter Interessen gemäß Art. 6 Abs. 1 lit. f DSGVO verarbeitet werden.
              </p>
            </Section>

            <Section title="5. KI-Chat und Google Gemini">
              <p>
                Für KI-gestützte Text- und gegebenenfalls multimodale Funktionen kann QuillAI Dienste aus der
                Google-Gemini-Familie einsetzen. Wenn Sie eine solche Funktion verwenden, werden die für die
                Bearbeitung erforderlichen Inhalte – insbesondere Prompts und gegebenenfalls bereitgestellte
                Dateien oder Bilder – an den jeweiligen KI-Dienst übermittelt.
              </p>
              <p>
                Bitte übermitteln Sie keine sensiblen personenbezogenen Daten oder vertraulichen Inhalte,
                sofern dies für Ihre Anfrage nicht zwingend erforderlich ist. Die Verarbeitung erfolgt zur
                Erbringung der von Ihnen angeforderten Funktion gemäß Art. 6 Abs. 1 lit. b DSGVO.
              </p>
            </Section>

            <Section title="6. Bildgenerierung und Bildbearbeitung">
              <p>
                QuillAI bietet KI-gestützte Bildgenerierung und Bildbearbeitung an. Je nach ausgewähltem Modell
                können hierfür externe KI-Anbieter bzw. Modell-Infrastrukturen eingesetzt werden, darunter
                Google Gemini, FLUX-basierte Dienste und Civitai-basierte Modelle. Zur Verarbeitung werden
                Ihre Prompts und – bei Image-to-Image-Funktionen – die von Ihnen hochgeladenen Ausgangsbilder
                an den für die jeweilige Funktion eingesetzten Dienst übermittelt.
              </p>
              <p>
                Hochgeladene Bilder können personenbezogene Daten enthalten. Laden Sie Bilder anderer Personen
                nur hoch, wenn Sie hierzu berechtigt sind. Für besonders sensible oder vertrauliche Bilder sollte
                die Funktion nicht verwendet werden.
              </p>
            </Section>

            <Section title="7. Videogenerierung">
              <p>
                Für Funktionen zur KI-Videogenerierung kann QuillAI externe Videogenerierungsdienste einsetzen,
                einschließlich Runway bzw. dort bereitgestellter Modelle. Dabei können Prompts, Referenzbilder
                und weitere für die Generierung erforderliche Eingaben an den jeweiligen Anbieter übermittelt werden.
              </p>
              <p>
                Die Verarbeitung erfolgt zur Durchführung der vom Nutzer angeforderten Generierung gemäß
                Art. 6 Abs. 1 lit. b DSGVO.
              </p>
            </Section>

            <Section title="8. 3D-Generierung">
              <p>
                Soweit QuillAI Funktionen zur Erstellung von 3D-Modellen anbietet, können Eingaben und
                hochgeladene Referenzdateien an externe Dienste übermittelt werden, die für die Generierung
                des jeweiligen 3D-Modells technisch erforderlich sind. Welche Daten verarbeitet werden,
                hängt von der konkret genutzten Funktion ab.
              </p>
            </Section>

            <Section title="9. Zahlungen und kostenpflichtige Tarife">
              <p>
                Bei kostenpflichtigen Angeboten werden die für die Zahlungsabwicklung erforderlichen Daten
                durch den jeweils eingesetzten Zahlungsdienstleister verarbeitet. QuillAI erhält dabei
                grundsätzlich nur die Informationen, die zur Zuordnung und Freischaltung einer Zahlung bzw.
                eines Tarifs erforderlich sind. Vollständige Zahlungsdaten wie Karten- oder Kontodaten werden
                grundsätzlich vom Zahlungsdienstleister verarbeitet.
              </p>
              <p>
                Die Verarbeitung erfolgt zur Vertragsdurchführung gemäß Art. 6 Abs. 1 lit. b DSGVO sowie,
                soweit gesetzliche Aufbewahrungspflichten bestehen, gemäß Art. 6 Abs. 1 lit. c DSGVO.
              </p>
            </Section>

            <Section title="10. Internationale Datenübermittlungen">
              <p>
                Einige eingesetzte Dienstleister können ihren Sitz außerhalb der Europäischen Union bzw.
                des Europäischen Wirtschaftsraums haben oder Daten dort verarbeiten. In solchen Fällen
                erfolgen Übermittlungen nur, soweit eine nach der DSGVO zulässige Grundlage besteht,
                beispielsweise ein Angemessenheitsbeschluss oder geeignete Garantien wie
                EU-Standardvertragsklauseln.
              </p>
            </Section>

            <Section title="11. Speicherdauer">
              <p>
                Personenbezogene Daten werden nur so lange gespeichert, wie dies für den jeweiligen Zweck
                erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen. Kontodaten werden grundsätzlich
                für die Dauer des Benutzerkontos verarbeitet. Technische Protokolldaten können für einen begrenzten
                Zeitraum zur Sicherheit und Fehleranalyse gespeichert werden.
              </p>
              <p>
                Für an externe KI-Dienste übermittelte Inhalte gelten zusätzlich die Speicher- und Löschregelungen
                des jeweils eingesetzten Dienstes. QuillAI bemüht sich, nur die für die jeweilige Funktion
                erforderlichen Daten zu übermitteln.
              </p>
            </Section>

            <Section title="12. Cookies und technisch erforderliche Speicherung">
              <p>
                QuillAI kann technisch erforderliche Cookies oder vergleichbare Speichertechnologien verwenden,
                insbesondere für Anmeldung, Sitzungsverwaltung, Spracheinstellungen und Sicherheitsfunktionen.
                Soweit diese für den ausdrücklich gewünschten Dienst erforderlich sind, erfolgt ihr Einsatz
                nach den anwendbaren gesetzlichen Bestimmungen ohne gesonderte Einwilligung.
              </p>
              <p>
                Sollten künftig nicht notwendige Analyse-, Marketing- oder Tracking-Technologien eingesetzt werden,
                werden diese – soweit gesetzlich erforderlich – erst nach Ihrer Einwilligung aktiviert.
              </p>
            </Section>

            <Section title="13. Ihre Rechte">
              <p>
                Nach Maßgabe der DSGVO haben Sie insbesondere das Recht auf Auskunft (Art. 15 DSGVO),
                Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung
                (Art. 18 DSGVO), Datenübertragbarkeit (Art. 20 DSGVO) und Widerspruch gegen bestimmte
                Verarbeitungen (Art. 21 DSGVO). Eine erteilte Einwilligung können Sie mit Wirkung für die
                Zukunft widerrufen.
              </p>
              <p>
                Sie haben außerdem das Recht, sich bei einer zuständigen Datenschutzaufsichtsbehörde zu beschweren.
              </p>
            </Section>

            <Section title="14. Sicherheit">
              <p>
                QuillAI setzt angemessene technische und organisatorische Maßnahmen ein, um personenbezogene
                Daten gegen Verlust, Missbrauch und unbefugten Zugriff zu schützen. Eine vollständig risikofreie
                Datenübertragung über das Internet kann jedoch nicht garantiert werden.
              </p>
            </Section>

            <Section title="15. Änderungen dieser Datenschutzerklärung">
              <p>
                Diese Datenschutzerklärung kann angepasst werden, wenn sich Funktionen, eingesetzte Dienstleister
                oder rechtliche Anforderungen ändern. Die jeweils aktuelle Fassung wird auf dieser Seite veröffentlicht.
              </p>
            </Section>
          </>
        ) : (
          <>
            <Section title="1. Controller">
              <p>
                The operator identified in the legal notice (Imprint) of quillai.online is responsible for
                processing personal data in connection with QuillAI. Please refer to the legal notice for
                contact details and the legally required address.
              </p>
            </Section>

            <Section title="2. General information">
              <p>
                QuillAI processes personal data where necessary to operate the website, provide user accounts,
                deliver requested AI features, provide paid services, maintain security and troubleshoot errors,
                or where another lawful basis applies.
              </p>
              <p>
                Depending on your use, this may include account and email data, technical connection and usage
                data, as well as prompts, text and files that you submit.
              </p>
            </Section>

            <Section title="3. Hosting and Netlify">
              <p>
                QuillAI uses Netlify to host and deliver the website and server-side functions. Technical data
                such as IP address, access time, requested resource, browser/device information and logs may be
                processed to provide and secure the service.
              </p>
            </Section>

            <Section title="4. Accounts and Supabase">
              <p>
                QuillAI uses Supabase for registration, authentication, session management and, where applicable,
                storage of application-related data. This may include your email address, user ID,
                authentication/session data and account-related usage data.
              </p>
            </Section>

            <Section title="5. AI services">
              <p>
                QuillAI may use external AI services for text, image, video and 3D functions, including services
                based on Google Gemini, FLUX, Civitai-hosted models and Runway. When you request a feature,
                the prompts, files, images or other inputs required to perform that request may be transmitted
                to the relevant service provider.
              </p>
              <p>
                Do not submit sensitive personal data or confidential material unless necessary. Only upload
                content involving other people where you have the right to do so.
              </p>
            </Section>

            <Section title="6. Payments">
              <p>
                For paid services, payment data required to complete a transaction is processed by the applicable
                payment provider. QuillAI generally receives only the information needed to associate a successful
                payment with an account or plan; complete card or bank details are generally handled by the
                payment provider.
              </p>
            </Section>

            <Section title="7. International transfers">
              <p>
                Some service providers may process data outside the EU/EEA. Where GDPR applies, transfers are
                made only where a permitted transfer mechanism is available, such as an adequacy decision or
                appropriate safeguards including EU Standard Contractual Clauses.
              </p>
            </Section>

            <Section title="8. Retention">
              <p>
                Personal data is retained only for as long as necessary for the relevant purpose or as required
                by law. External AI providers may apply their own retention rules to data transmitted to them.
              </p>
            </Section>

            <Section title="9. Cookies and necessary storage">
              <p>
                QuillAI may use technically necessary cookies or similar storage for authentication, sessions,
                language preferences and security. If non-essential analytics, advertising or tracking
                technologies are introduced, consent will be requested where required by law.
              </p>
            </Section>

            <Section title="10. Your rights">
              <p>
                Where GDPR applies, you may have rights of access, rectification, erasure, restriction,
                data portability and objection, as well as the right to withdraw consent for the future.
                You may also lodge a complaint with a competent data protection authority.
              </p>
            </Section>

            <Section title="11. Security and changes">
              <p>
                QuillAI uses appropriate technical and organizational measures to protect personal data.
                This policy may be updated when services, providers or legal requirements change. The current
                version will be published on this page.
              </p>
            </Section>
          </>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed">
          {de
            ? "Hinweis: Diese Datenschutzerklärung wurde an die derzeit bekannte technische Struktur von QuillAI angepasst. Sie ersetzt keine individuelle Rechtsberatung. Vor produktivem Einsatz sollten insbesondere Anbieter, Zahlungsdienstleister, Speicherfristen und internationale Datentransfers anhand der tatsächlich eingesetzten Verträge und Konfigurationen rechtlich geprüft werden."
            : "Note: This privacy policy reflects QuillAI's currently known technical setup and is not a substitute for individual legal advice. Before production use, providers, payment processors, retention periods and international data transfers should be verified against the services and contracts actually in use."}
        </p>
      </main>
    </div>
  );
}
