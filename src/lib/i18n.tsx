import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "de" | "en";
const KEY = "quill-lang";

type Dict = Record<string, string>;

const de: Dict = {
  // Common
  "common.login": "Einloggen",
  "common.signup": "Registrieren",
  "common.createAccount": "Account erstellen",
  "common.loading": "Lädt...",
  "common.understood": "Verstanden",
  "common.back_home": "Zur Startseite",
  "common.or": "oder",
  "auth.google": "Mit Google anmelden",

  // Landing
  "landing.tagline": "KI-Chat · Bildgenerierung · Analyse",
  "landing.title1": "Dein persönlicher",
  "landing.title2": "KI-Assistent.",
  "landing.subtitle": "Chatte mit KI, erstelle beeindruckende Bilder, analysiere Dokumente und erstelle Videos – alles in einem übersichtlichen Arbeitsbereich.",
  "landing.footer": "QuillAI · Dein KI-Assistent",
  "landing.discover_title": "Eine KI für alles, was du brauchst",
  "landing.discover_intro": "Stelle Fragen, lass dir Bilder erstellen oder Dokumente analysieren – in einer eleganten, ablenkungsfreien Oberfläche.",
  "landing.highlight1_title": "Kostenloser Text-Chat",
  "landing.highlight1_desc": "Unbegrenzte Unterhaltungen mit QuillAI – kostenlos für alle registrierten Nutzer. Ideal für Brainstorming, Recherche, Übersetzungen und schnelle Antworten.",
  "landing.highlight2_title": "Premium Bildgenerierung",
  "landing.highlight2_desc": "Beschreibe einfach, was du sehen willst – QuillAI erstellt hochwertige KI-Bilder in Sekunden. Wähle zwischen Google Gemini 2.5 Flash Image, FLUX.1 Schnell und Lustify V8 (Civitai SDXL-Checkpoint, NSFW-fähig, 0,05 €/Bild). Inklusive intelligentem Image-to-Image, um deine eigenen Fotos direkt im Chat per Textbefehl in neue Stile zu verwandeln. Standard Pro: 500 Bilder im Monat für 3,90 €. Ultimate Video: 900 Bilder im Monat für 10,00 €.",
  "landing.highlight3_title": "Premium Dokumenten- & Bildanalyse",
  "landing.highlight3_desc": "Lade PDFs, DOCX, TXT, CSV oder Fotos hoch und lass QuillAI Inhalte zusammenfassen, erklären oder durchsuchen. In jedem Premium-Tarif enthalten (ab 3,90 € im Monat).",
  "landing.highlight4_title": "Kreative KI-Videogenerierung",
"landing.highlight4_desc": "Inklusive 15 KI-Videoclips pro Monat (Basisclips mit 8 s, erweiterbar auf bis zu 16 s durch einmaliges Verlängern). Erschaffe kurze Videoclips und hochwertige Animationen aus Textbeschreibungen oder erwecke deine eigenen hochgeladenen Bilder zum Leben (Image-to-Video). Nur im Ultimate Video Tarif (10,00 € im Monat).",
  "landing.highlight5_title": "Maßgeschneiderte KI-Experten",
  "landing.highlight5_desc": "Schalte per Klick spezialisierte Modi frei: Ob Business-Berater, Code-Experte, Copywriter oder Lehrer – QuillAI passt seinen Fokus und Tonfall exakt an deine Aufgabe an.",
  "landing.highlight6_title": "3D-Kreator",
  "landing.highlight6_desc": "Erstelle interaktive 3D-Charaktere und Objekte aus Textbeschreibungen oder lade ein Referenzbild hoch, um die Gestaltung zu steuern. Drehe die Modelle frei mit der Maus und exportiere sie als .glb-Datei. Powered by Tripo3D (v3.0-20250812). Exklusiv im Ultimate Video Tarif – maximal 20 Generierungen pro Monat.",
  "landing.highlight7_title": "Live-Sprachchat (Realtime Voice)",
  "landing.highlight7_desc": "Sprich in Echtzeit mit QuillAI – powered by OpenAI GPT-4o mini Realtime mit natürlicher weiblicher Stimme (shimmer). Tippe im Chat auf das Mikrofon und führe ein fließendes Gespräch mit sofortiger Sprachantwort. Exklusiv im Ultimate Video Tarif (10,00 € im Monat) – 20 Live-Minuten pro Monat inklusive.",
  "landing.highlight8_title": "5-€ Universalguthaben (Top-up)",
  "landing.highlight8_desc": "Sobald dein monatliches Inklusiv-Kontingent aufgebraucht ist, greift das Universalguthaben automatisch: Live-Sprache 0,20 €/Min., Bilder 0,03 €/Stück, Videos 0,40 €/Clip. Einmalig 5,00 € per PayPal aufladen – stapelbar und jederzeit verfügbar. Nur für Premium-Nutzer.",
  "landing.cta_text": "Starte sofort kostenlos mit dem QuillAI Chat. Wähle zwischen Standard Pro (3,90 € im Monat · 500 Bilder) und Ultimate Video (10,00 € im Monat · 900 Bilder + 15 Videos + 20 3D-Modelle). Monatlich kündbar.",
  "landing.volume_callout": "Angetrieben von Google Gemini 2.5 Flash, Google Gemini 2.5 Flash Image, FLUX.1 Schnell, Lustify V8 (Civitai SDXL) & Runway Veo 3.1 Fast – Zwei Tarife: Standard Pro 3,90 € (500 Bilder, kein Video, kein 3D) oder Ultimate Video 10,00 € (900 Bilder + 15 Videos + 20 3D-Modelle).",
  "landing.header.ai_cta": "Chat starten",
  "landing.header.small_button": "Mehr zu QuillAI",
  "landing.demo.user": "Erkläre mir Quantencomputer in einem Satz.",
  "landing.demo.assistant": "Quantencomputer nutzen Quantenbits, die mehrere Zustände gleichzeitig einnehmen, um bestimmte Aufgaben dramatisch schneller zu lösen als klassische Rechner.",

  // Auth features
  "auth.features.title": "Warum QuillAI?",
  "auth.features.f1.title": "Kostenloser Text-Chat",
  "auth.features.f1.desc": "Unbegrenzte KI-Unterhaltungen für alle registrierten Nutzer – ohne Kosten, ohne Limit.",
  "auth.features.f2.title": "Premium Bildgenerierung",
  "auth.features.f2.desc": "Erstelle KI-Bilder in Sekunden. Standard Pro: 500 im Monat (3,90 €). Ultimate: 900 im Monat (10,00 €).",
  "auth.features.f3.title": "Premium Dokumenten- & Bildanalyse",
  "auth.features.f3.desc": "Lade PDF, DOCX, TXT, CSV oder Fotos hoch und lass QuillAI alles auswerten. In jedem Premium-Tarif enthalten.",
  "auth.features.f4.title": "Schnell & elegant",
  "auth.features.f4.desc": "Moderne, ablenkungsfreie Oberfläche im ChatGPT-Stil – ohne Werbung, ohne Tracking.",

  // Pricing
  "auth.pricing.title": "Zwei Tarife – fair und transparent",
  "auth.pricing.standard_badge": "Standard Pro",
  "auth.pricing.standard_price": "3,90 €",
  "auth.pricing.standard_tagline": "Für Kreative & Gelegenheitsnutzer",
  "auth.pricing.ultimate_badge": "Ultimate Video",
  "auth.pricing.ultimate_price": "10,00 €",
  "auth.pricing.ultimate_tagline": "Für Power-User",
  "auth.pricing.per": "im Monat",
  "auth.pricing.std_b1": "Unbegrenzter Text-Chat",
  "auth.pricing.std_b2": "Alle Experten-Modi",
  "auth.pricing.std_b3": "Dokumenten- & Bildanalyse",
  "auth.pricing.std_b4": "500 KI-Bilder pro Monat",
  "auth.pricing.std_b5": "Keine KI-Videogenerierung",
  "auth.pricing.std_b6": "Kein Zugriff auf den 3D-Kreator",
  "auth.pricing.ult_b1": "Unbegrenzter Text-Chat",
  "auth.pricing.ult_b2": "Alle Experten-Modi",
  "auth.pricing.ult_b3": "Dokumenten- & Bildanalyse",
  "auth.pricing.ult_b4": "900 KI-Bilder pro Monat",
  "auth.pricing.ult_b5": "15 Runway KI-Videos pro Monat",
  "auth.pricing.ult_b6": "20 3D-Modelle pro Monat (3D-Kreator)",
  "auth.pricing.ult_b7": "20 Min. Live-Sprachchat pro Monat (Realtime Voice)",
  "auth.pricing.note": "Keine versteckten Kosten. Monatlich kündbar. Bei einer Kontolöschung wird dein PayPal-Abo automatisch beendet.",

  // Nav
  "nav.ai_chat": "QuillAI Chat",
  "nav.settings": "Einstellungen",
  "nav.signout": "Abmelden",
  "nav.safety": "Sicherheit",
  "nav.privacy": "Datenschutz",
  "nav.terms": "Nutzungsbedingungen",
  "ai_chat.disclaimer": "QuillAI kann Fehler machen. Wichtige Infos überprüfen.",
  "ai_chat.terms_link": "Nutzungsbedingungen",

  // Guest mode models
  "guest.models_title": "Verfügbare KI-Modelle",
  "guest.models_free": "Kostenlos im Gast-Modus",
  "guest.models_premium": "Premium nach Anmeldung",

  // Paywall
  "paywall.default_title": "Wähle deinen Premium-Tarif",
  "paywall.default_desc_a": "Schalte Premium für",
  "paywall.default_desc_b": "frei, um diese Funktion zu nutzen.",
  "paywall.loading_paypal": "Lädt PayPal …",
  "paywall.footer_note_live": "Sicherer Checkout via PayPal · Live-Modus",
  "paywall.footer_note_sandbox": "Sicherer Checkout via PayPal · Sandbox / Testmodus",
  "paywall.config_incomplete": "Zahlungs-Konfiguration unvollständig. Bitte später erneut versuchen.",
  "paywall.toast_active": "Premium aktiv – viel Spaß!",
  "paywall.toast_pending": "Abo wird bestätigt …",
  "paywall.toast_failed": "Abo-Aktivierung fehlgeschlagen",
  "paywall.toast_error": "PayPal-Fehler. Bitte erneut versuchen.",
  "paywall.unknown_error": "Unbekannter Fehler",
 "paywall.limit_reached_image": "Bild-Limit erreicht. Lade dein 5-Euro-Universalguthaben auf, um sofort neue Bilder, Videos oder Sprachminuten freizuschalten!",
 "paywall.limit_reached_video": "Video-Limit erreicht. Lade dein 5-Euro-Universalguthaben auf, um sofort neue Videos, Bilder oder Sprachminuten freizuschalten!",

  // Usage display
  "usage.title": "Dein Premium-Verbrauch (dieser Monat)",
  "usage.images_remaining": "Verbleibende Bilder",
  "usage.videos_remaining": "Verbleibende Videos",
  "usage.resets_note": "Zähler werden am 1. des nächsten Monats automatisch zurückgesetzt.",

  // Auth
  "auth.welcome_back": "Willkommen zurück",
  "auth.create_account": "Erstelle deinen Account",
  "auth.username": "Benutzername",
  "auth.email": "Email",
  "auth.password": "Passwort",
  "auth.no_account": "Noch kein Konto?",
  "auth.have_account": "Bereits registriert?",
  "auth.welcome": "Willkommen bei QuillAI!",
  "auth.forgot_password": "Passwort vergessen?",
  "auth.reset_title": "Passwort zurücksetzen",
  "auth.reset_desc": "Gib deine registrierte E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen.",
  "auth.reset_submit": "Link anfordern",
  "auth.reset_sending": "Wird gesendet...",
  "auth.reset_sent": "Ein Link zum Zurücksetzen des Passworts wurde an deine E-Mail-Adresse gesendet.",
  "auth.reset_back": "Zurück zum Login",
  "auth.new_password": "Neues Passwort",
  "auth.confirm_password": "Passwort bestätigen",
  "auth.password_mismatch": "Passwörter stimmen nicht überein",
  "auth.password_alphanumeric": "Passwort darf nur Buchstaben und Zahlen enthalten",
  "auth.password_updated": "Passwort aktualisiert. Du bist jetzt eingeloggt.",
  "auth.save_password": "Passwort speichern",
  "auth.invalid_reset_link": "Ungültiger oder abgelaufener Link.",

  // Language
  "lang.label": "Sprache",
  "lang.de": "Deutsch",
  "lang.en": "Englisch",

  // Settings page
  "settings.title": "Einstellungen",
  "settings.change_image": "Bild ändern",
  "settings.cancel": "Abbrechen",
  "settings.username": "Benutzername",
  "settings.username_hint": "Benutzername kann nicht geändert werden.",
  "settings.display_name": "Anzeigename",
  "settings.bio": "Bio",
  "settings.bio_placeholder": "Erzähle etwas über dich...",
  "settings.signout": "Abmelden",
  "settings.save": "Speichern",
  "settings.saving": "Speichert...",
  "settings.saved": "Gespeichert",
  "settings.err_name": "Bitte einen Namen",
  "settings.err_bio": "Max 280 Zeichen",
  "settings.err_image_only": "Nur Bilder",
  "settings.err_image_size": "Max 3 MB",
  "settings.err_generic": "Fehler",
  "settings.danger_zone": "Gefahrenzone",
  "settings.delete_account_desc": "Lösche dein Konto und alle damit verknüpften Daten unwiderruflich.",
  "settings.delete_account_btn": "Konto löschen",
  "settings.delete_confirm_title": "Bist du dir sicher?",
  "settings.delete_confirm_text": "Diese Aktion kann nicht rückgängig gemacht werden. Dein Profil und dein Abo werden unwiderruflich gelöscht.",
  "settings.delete_confirm_paypal_auto": "Dein aktives Premium-Abonnement wird mit der Löschung automatisch gekündigt. Es fallen keine weiteren Kosten an.",
  "settings.delete_paypal_check": "Konto gelöscht. Bitte prüfe kurz dein PayPal-Konto — die automatische Kündigung konnte nicht bestätigt werden.",
  "settings.delete_confirm_check": "Ich habe verstanden und möchte mein Konto endgültig löschen.",
  "settings.delete_confirm_btn": "Ja, mein Konto endgültig löschen",
  "settings.delete_success": "Dein Konto wurde gelöscht.",
  "settings.delete_failed": "Löschen fehlgeschlagen",
  "settings.legal_title": "Rechtlicher Hinweis",
  "settings.legal_note": "QuillAI kann Fehler machen. Wichtige Infos überprüfen.",
  "settings.terms_link": "Nutzungsbedingungen",

  // Subscription card
  "sub.title": "QuillAI Premium",
  "sub.price": "10,00\u00a0€ im Monat",
  "sub.status.active": "Aktiv",
  "sub.status.pending": "Wird bestätigt",
  "sub.status.cancelled": "Gekündigt",
  "sub.status.suspended": "Pausiert",
  "sub.status.inactive": "Kein Abo",
  "sub.loading": "Lädt …",
  "sub.expires_on": "Läuft ab am",
  "sub.next_billing": "Nächste Abrechnung",
  "sub.cancelled_on": "Gekündigt am",
  "sub.cancel": "Kündigen",
  "sub.cancelling": "Kündigt …",
  "sub.cancel_confirm_title": "Abo wirklich kündigen?",
  "sub.cancel_confirm_desc": "Du kannst Premium-Funktionen bis zum Ende der aktuellen Abrechnungsperiode weiter nutzen. Danach werden Bildgenerierung und Analyse wieder gesperrt.",
  "sub.keep": "Behalten",
  "sub.confirm_cancel": "Ja, kündigen",
  "sub.reactivate": "Reaktivieren",
  "sub.unlock_now": "Jetzt freischalten",
  "sub.cancel_success": "Abo gekündigt",
  "sub.cancel_failed": "Kündigung fehlgeschlagen",
  "sub.date_locale": "de-DE",

  // 3D Creator
  "kreator.title": "3D-Kreator",
  "kreator.subtitle": "Beschreibe dein Modell und lade optional ein Referenzbild hoch.",
  "kreator.prompt": "Prompt",
  "kreator.prompt_placeholder": "z. B. Ein stilisierter Low-Poly-Fuchs, sitzend, weiche Formen…",
  "kreator.reference": "Referenzbild",
  "kreator.drop_hint": "Bild hierher ziehen oder",
  "kreator.choose": "auswählen",
  "kreator.file_types": "PNG, JPG, WebP · max. 15 MB",
  "kreator.replace": "Klicken zum Ersetzen",
  "kreator.remove_image": "Bild entfernen",
  "kreator.settings": "Einstellungen",
  "kreator.mesh_type": "Mesh-Typ",
  "kreator.mesh_triangle": "Triangle Mesh",
  "kreator.mesh_quad": "Quad Mesh",
  "kreator.symmetric": "Symmetrische Geometrie",
  "kreator.generate": "3D-Modell erstellen",
  "kreator.generating": "Wird erstellt…",
  "kreator.result": "Ergebnis",
  "kreator.download": "3D-Modell herunterladen (.glb)",
  "kreator.overlay_title": "Modell wird generiert…",
  "kreator.overlay_hint": "Bitte ca. 40 Sekunden warten",
  "kreator.err_prompt": "Bitte einen Prompt eingeben.",
  "kreator.err_image_type": "Bitte eine Bilddatei ablegen.",
  "kreator.err_image_size": "Bild ist zu groß (max. 15 MB).",
  "kreator.err_generation": "Fehler bei der Generierung.",
  "kreator.success": "3D-Modell fertig.",
  "kreator.lock_title": "Verfügbar im Ultimate Video Tarif",
  "kreator.lock_desc": "Der 3D-Kreator ist ausschließlich für Abonnenten des Ultimate Video Tarifs freigeschaltet (max. 20 Generierungen pro Monat).",
  "kreator.lock_cta": "Auf Ultimate Video upgraden",
  "kreator.lock_short": "Verfügbar im Ultimate Video Tarif",
  "kreator.limit_reached": "Monatliches Limit erreicht",
  "kreator.usage": "{used} / {limit} Generierungen diesen Monat verbraucht.",
  "kreator.model_badge": "Tripo3D v3.0-20250812",
  "kreator.err_ultimate": "Verfügbar im Ultimate Video Tarif.",
};

const en: Dict = {
  "common.login": "Log In",
  "common.signup": "Sign Up",
  "common.createAccount": "Create Account",
  "common.loading": "Loading...",
  "common.understood": "Got it",
  "common.back_home": "Back to home",
  "common.or": "or",
  "auth.google": "Sign in with Google",

  "landing.tagline": "AI Chat · Image Generation · Analysis",
  "landing.title1": "Your personal",
  "landing.title2": "AI assistant.",
  "landing.subtitle": "Chat with AI, generate stunning images, analyze documents and create videos — all in one clean workspace.",
  "landing.footer": "QuillAI · Your AI assistant",
  "landing.discover_title": "One AI for everything you need",
  "landing.discover_intro": "Ask questions, generate images, or analyze documents – in an elegant, distraction-free interface.",
  "landing.highlight1_title": "Free Text Chat",
  "landing.highlight1_desc": "Unlimited conversations with QuillAI – free for every registered user. Perfect for brainstorming, research, translation and quick answers.",
  "landing.highlight2_title": "Premium Image Generation",
  "landing.highlight2_desc": "Describe what you want to see – QuillAI creates high-quality AI images in seconds. Choose between Google Gemini 2.5 Flash Image, FLUX.1 Fast and Lustify V8 (Civitai SDXL checkpoint, NSFW-capable, €0.05/image). Includes intelligent Image-to-Image to transform your own photos into new styles directly in chat using text prompts. Standard Pro: 500 images per month ($3.90). Ultimate Video: 900 images per month ($10.00).",
  "landing.highlight3_title": "Premium Document & Image Analysis",
  "landing.highlight3_desc": "Upload PDFs, DOCX, TXT, CSV or photos and let QuillAI summarize, explain or search the content. Included in every Premium tier (from $3.90 per month).",
  "landing.highlight4_title": "AI Video Generation",
"landing.highlight4_desc": "Includes 15 AI video clips per month (base clips of 8 s, extendable up to 16 s with a one-time extension). Create short video clips and high-quality animations from text prompts or bring your own uploaded images to life (Image-to-Video). Ultimate Video tier only ($10.00 per month).",
  "landing.highlight5_title": "Tailored AI Specialists",
  "landing.highlight5_desc": "Switch between specialized modes with one click: business advisor, code expert, copywriter, or tutor. QuillAI adapts its focus and tone perfectly to your task.",
  "landing.highlight6_title": "3D Creator",
  "landing.highlight6_desc": "Create interactive 3D characters and objects from text descriptions or upload a reference image to guide the design. Rotate models freely with your mouse and export them as .glb files. Powered by Tripo3D (v3.0-20250812). Exclusive to the Ultimate Video plan – up to 20 generations per month.",
  "landing.highlight7_title": "Live Voice Chat (Realtime)",
  "landing.highlight7_desc": "Talk to QuillAI in real time – powered by OpenAI GPT-4o mini Realtime with a natural female voice (shimmer). Tap the microphone in chat and have a flowing conversation with instant spoken replies. Exclusive to the Ultimate Video plan ($10.00 per month) – 20 live minutes per month included.",
  "landing.highlight8_title": "5 € Universal Balance (Top-up)",
  "landing.highlight8_desc": "Once your monthly inclusive quota is used up, universal balance kicks in automatically: live voice 0.20 €/min., images 0.03 € each, videos 0.40 €/clip. Top up 5.00 € via PayPal once – stackable and always available. Premium users only.",
  "landing.cta_text": "Start chatting with QuillAI for free right now. Choose between Standard Pro ($3.90 per month · 500 images) and Ultimate Video ($10.00 per month · 900 images + 15 videos + 20 3D models). Cancel anytime.",
  "landing.volume_callout": "Powered by Google Gemini 2.5 Flash, Google Gemini 2.5 Flash Image, FLUX.1 Fast, Lustify V8 (Civitai SDXL) & Runway Veo 3.1 Fast – Two tiers: Standard Pro $3.90 (500 images, no video, no 3D) or Ultimate Video $10.00 (900 images + 15 videos + 20 3D models).",
  "landing.header.ai_cta": "Start Chat",
  "landing.header.small_button": "About QuillAI",
  "landing.demo.user": "Explain quantum computing in one sentence.",
  "landing.demo.assistant": "Quantum computers use quantum bits that can hold multiple states at once, letting them solve certain problems dramatically faster than classical computers.",

  "auth.features.title": "Why QuillAI?",
  "auth.features.f1.title": "Free Text Chat",
  "auth.features.f1.desc": "Unlimited AI conversations for every registered user – no cost, no limit.",
  "auth.features.f2.title": "Premium Image Generation",
  "auth.features.f2.desc": "Create AI images in seconds. Standard Pro: 500 per month ($3.90). Ultimate: 900 per month ($10.00).",
  "auth.features.f3.title": "Premium Document & Image Analysis",
  "auth.features.f3.desc": "Upload PDF, DOCX, TXT, CSV or photos and let QuillAI analyze them. Included in every Premium tier.",
  "auth.features.f4.title": "Fast & elegant",
  "auth.features.f4.desc": "Modern, distraction-free ChatGPT-style interface – no ads, no tracking.",

  "auth.pricing.title": "Two tiers – fair and transparent",
  "auth.pricing.standard_badge": "Standard Pro",
  "auth.pricing.standard_price": "$3.90",
  "auth.pricing.standard_tagline": "For creatives & casual users",
  "auth.pricing.ultimate_badge": "Ultimate Video",
  "auth.pricing.ultimate_price": "$10.00",
  "auth.pricing.ultimate_tagline": "For power users",
  "auth.pricing.per": "per month",
  "auth.pricing.std_b1": "Unlimited text chat",
  "auth.pricing.std_b2": "All expert modes",
  "auth.pricing.std_b3": "Document & image analysis",
  "auth.pricing.std_b4": "500 AI images per month",
  "auth.pricing.std_b5": "No AI video generation",
  "auth.pricing.std_b6": "No access to the 3D Creator",
  "auth.pricing.ult_b1": "Unlimited text chat",
  "auth.pricing.ult_b2": "All expert modes",
  "auth.pricing.ult_b3": "Document & image analysis",
  "auth.pricing.ult_b4": "900 AI images per month",
  "auth.pricing.ult_b5": "15 Runway AI videos per month",
  "auth.pricing.ult_b6": "20 3D models per month (3D Creator)",
  "auth.pricing.ult_b7": "20 min Live Voice Chat per month (Realtime)",
  "auth.pricing.note": "No hidden fees. Cancel monthly. If you delete your account, your PayPal subscription is cancelled automatically.",

  "nav.ai_chat": "QuillAI Chat",
  "nav.settings": "Settings",
  "nav.signout": "Sign Out",
  "nav.safety": "Safety",
  "nav.privacy": "Privacy",
  "nav.terms": "Terms",
  "ai_chat.disclaimer": "QuillAI can make mistakes. Check important info.",
  "ai_chat.terms_link": "Terms of Service",

  // Guest mode models
  "guest.models_title": "Available AI models",
  "guest.models_free": "Free in guest mode",
  "guest.models_premium": "Premium after sign-up",

  "paywall.default_title": "Choose your Premium plan",
  "paywall.default_desc_a": "Unlock Premium for",
  "paywall.default_desc_b": "to use this feature.",
  "paywall.loading_paypal": "Loading PayPal …",
  "paywall.footer_note_live": "Secure checkout via PayPal · Live mode",
  "paywall.footer_note_sandbox": "Secure checkout via PayPal · Sandbox / Test mode",
  "paywall.config_incomplete": "Payment configuration incomplete. Please try again later.",
  "paywall.toast_active": "Premium active – enjoy!",
  "paywall.toast_pending": "Subscription is being confirmed …",
  "paywall.toast_failed": "Subscription activation failed",
  "paywall.toast_error": "PayPal error. Please try again.",
  "paywall.unknown_error": "Unknown error",
 "paywall.limit_reached_image": "Image limit reached. Top up your €5 Universal balance to unlock new images, videos or voice minutes right away!",
 "paywall.limit_reached_video": "Video limit reached. Top up your €5 Universal balance to unlock new videos, images or voice minutes right away!",

  "usage.title": "Your Premium usage (this month)",
  "usage.images_remaining": "Images remaining",
  "usage.videos_remaining": "Videos remaining",
  "usage.resets_note": "Counters reset automatically on the 1st of next month.",

  "auth.welcome_back": "Welcome back",
  "auth.create_account": "Create your account",
  "auth.username": "Username",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.no_account": "No account yet?",
  "auth.have_account": "Already registered?",
  "auth.welcome": "Welcome to QuillAI!",
  "auth.forgot_password": "Forgot password?",
  "auth.reset_title": "Reset password",
  "auth.reset_desc": "Enter your registered email address. We'll send you a reset link.",
  "auth.reset_submit": "Request reset link",
  "auth.reset_sending": "Sending...",
  "auth.reset_sent": "A password reset link has been sent to your email address.",
  "auth.reset_back": "Back to login",
  "auth.new_password": "New password",
  "auth.confirm_password": "Confirm password",
  "auth.password_mismatch": "Passwords do not match",
  "auth.password_alphanumeric": "Password may only contain letters and numbers",
  "auth.password_updated": "Password updated. You're now logged in.",
  "auth.save_password": "Save password",
  "auth.invalid_reset_link": "Invalid or expired link.",

  "lang.label": "Language",
  "lang.de": "German",
  "lang.en": "English",

  "settings.title": "Settings",
  "settings.change_image": "Change image",
  "settings.cancel": "Cancel",
  "settings.username": "Username",
  "settings.username_hint": "Username cannot be changed.",
  "settings.display_name": "Display name",
  "settings.bio": "Bio",
  "settings.bio_placeholder": "Tell something about yourself...",
  "settings.signout": "Sign out",
  "settings.save": "Save",
  "settings.saving": "Saving...",
  "settings.saved": "Saved",
  "settings.err_name": "Please enter a name",
  "settings.err_bio": "Max 280 characters",
  "settings.err_image_only": "Images only",
  "settings.err_image_size": "Max 3 MB",
  "settings.err_generic": "Error",
  "settings.danger_zone": "Danger zone",
  "settings.delete_account_desc": "Permanently delete your account and all associated data.",
  "settings.delete_account_btn": "Delete account",
  "settings.delete_confirm_title": "Are you sure?",
  "settings.delete_confirm_text": "This action cannot be undone. Your profile and subscription will be permanently deleted.",
  "settings.delete_confirm_paypal_auto": "Your active premium subscription will be automatically cancelled upon deletion. No further charges will apply.",
  "settings.delete_paypal_check": "Account deleted. Please double-check your PayPal account — automatic cancellation could not be confirmed.",
  "settings.delete_confirm_check": "I understand and want to permanently delete my account.",
  "settings.delete_confirm_btn": "Yes, permanently delete my account",
  "settings.delete_success": "Your account has been deleted.",
  "settings.delete_failed": "Deletion failed",
  "settings.legal_title": "Legal notice",
  "settings.legal_note": "QuillAI can make mistakes. Check important info.",
  "settings.terms_link": "Terms of Service",

  "sub.title": "QuillAI Premium",
  "sub.price": "$10.00 per month",
  "sub.status.active": "Active",
  "sub.status.pending": "Pending",
  "sub.status.cancelled": "Cancelled",
  "sub.status.suspended": "Paused",
  "sub.status.inactive": "No subscription",
  "sub.loading": "Loading …",
  "sub.expires_on": "Expires on",
  "sub.next_billing": "Next billing",
  "sub.cancelled_on": "Cancelled on",
  "sub.cancel": "Cancel",
  "sub.cancelling": "Cancelling …",
  "sub.cancel_confirm_title": "Cancel subscription?",
  "sub.cancel_confirm_desc": "You can keep using premium features until the end of the current billing period. After that, image generation and analysis will be locked again.",
  "sub.keep": "Keep",
  "sub.confirm_cancel": "Yes, cancel",
  "sub.reactivate": "Reactivate",
  "sub.unlock_now": "Unlock now",
  "sub.cancel_success": "Subscription cancelled",
  "sub.cancel_failed": "Cancellation failed",
  "sub.date_locale": "en-US",

  // 3D Creator
  "kreator.title": "3D Creator",
  "kreator.subtitle": "Describe your model and optionally upload a reference image.",
  "kreator.prompt": "Prompt",
  "kreator.prompt_placeholder": "e.g. A stylized low-poly fox, sitting, soft shapes…",
  "kreator.reference": "Reference image",
  "kreator.drop_hint": "Drag an image here or",
  "kreator.choose": "browse",
  "kreator.file_types": "PNG, JPG, WebP · max. 15 MB",
  "kreator.replace": "Click to replace",
  "kreator.remove_image": "Remove image",
  "kreator.settings": "Settings",
  "kreator.mesh_type": "Mesh type",
  "kreator.mesh_triangle": "Triangle mesh",
  "kreator.mesh_quad": "Quad mesh",
  "kreator.symmetric": "Symmetric geometry",
  "kreator.generate": "Create 3D model",
  "kreator.generating": "Generating…",
  "kreator.result": "Result",
  "kreator.download": "Download 3D model (.glb)",
  "kreator.overlay_title": "Generating your model…",
  "kreator.overlay_hint": "Please wait about 40 seconds",
  "kreator.err_prompt": "Please enter a prompt.",
  "kreator.err_image_type": "Please drop an image file.",
  "kreator.err_image_size": "Image is too large (max. 15 MB).",
  "kreator.err_generation": "Generation failed.",
  "kreator.success": "3D model is ready.",
  "kreator.lock_title": "Available on the Ultimate Video plan",
  "kreator.lock_desc": "The 3D Creator is exclusive to Ultimate Video subscribers (max. 20 generations per month).",
  "kreator.lock_cta": "Upgrade to Ultimate Video",
  "kreator.lock_short": "Available on the Ultimate Video plan",
  "kreator.limit_reached": "Monthly limit reached",
  "kreator.usage": "{used} / {limit} generations used this month.",
  "kreator.model_badge": "Tripo3D v3.0-20250812",
  "kreator.err_ultimate": "Available on the Ultimate Video plan.",
};

const DICTS: Record<Lang, Dict> = { de, en };

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored === "de" || stored === "en") return stored;
    const nav = (window.navigator.language || "en").toLowerCase();
    return nav.startsWith("de") ? "de" : "en";
  } catch {
    return "en";
  }
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => getInitialLang());

  useEffect(() => {
    try { window.localStorage.setItem(KEY, lang); } catch {}
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = DICTS[lang][key] ?? DICTS.de[key] ?? key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  return {
    lang: "de",
    setLang: () => {},
    t: (key, vars) => {
      const raw = de[key] ?? key;
      return vars ? raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : raw;
    },
  };
}
