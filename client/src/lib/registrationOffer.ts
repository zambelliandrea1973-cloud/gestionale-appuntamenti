import { buildSupportWhatsAppUrl } from "../../../shared/supportWhatsApp";

export const REGISTRATION_OFFER_COPY = {
  title: "Il tuo primo appuntamento, passo dopo passo",
  introduction: "Account creato! Se vuoi, ti accompagno nei primi passi nel gestionale.",
  offerTitle: "Videochiamata gratuita di 15 minuti",
  offerDescription:
    "Concordiamo insieme giorno e ora su WhatsApp. Risponderò alle tue domande e ti guiderò passo passo a creare il tuo primo appuntamento.",
  whatsappLabel: "Concorda la chiamata su WhatsApp",
  continueLabel: "Vai al gestionale",
  whatsappMessage:
    "Ciao, ho appena creato un account e vorrei concordare la videochiamata gratuita di 15 minuti. Vorrei fare qualche domanda e ricevere una guida passo passo per creare il mio primo appuntamento.",
} as const;

export function isItalianRegistrationOfferLocale(locale: string | undefined): boolean {
  return locale?.toLowerCase().split(/[-_]/, 1)[0] === "it";
}

export function buildRegistrationOfferWhatsAppUrl(): string {
  return buildSupportWhatsAppUrl(REGISTRATION_OFFER_COPY.whatsappMessage);
}
