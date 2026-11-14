export const SUPPORT_WHATSAPP_NUMBER = "393472550110";

export const ITALIAN_SETUP_SERVICE_OFFER = {
  title: "Configurazione completa del gestionale",
  description: "Configuro il programma e importo fino a 100 contatti, aiutandoti a iniziare.",
  priceLabel: "Servizio completo a €197",
  whatsappMessage: "Ciao, vorrei richiedere informazioni per la configurazione completa del gestionale con importazione fino a 100 contatti a €197.",
  whatsappCta: "Richiedi la configurazione completa",
} as const;

export function buildSupportWhatsAppUrl(message: string): string {
  const url = new URL(`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`);
  url.searchParams.set("text", message);
  return url.toString();
}
