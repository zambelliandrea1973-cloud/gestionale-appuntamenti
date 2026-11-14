import {
  buildSupportWhatsAppUrl,
  ITALIAN_SETUP_SERVICE_OFFER,
} from '../../shared/supportWhatsApp';
import { SupportedLang } from '../utils/emailTranslations';

export const ITALIAN_HELP_CALL_OFFER = {
  title: 'Una mano per iniziare',
  description:
    'Se lo desideri, puoi concordare una videochiamata gratuita di 15 minuti: ti aiuterò nella prima configurazione, risponderò alle tue domande e ti guiderò passo passo a creare il tuo primo appuntamento.',
  whatsappMessage:
    'Ciao, vorrei concordare una videochiamata gratuita di 15 minuti per ricevere assistenza alla prima configurazione, fare alcune domande e creare il mio primo appuntamento.',
  whatsappLabel: 'Concorda l’appuntamento su WhatsApp',
  whatsappNumberLabel: '347 255 0110',
} as const;

export function getItalianHelpCallOffer(language: SupportedLang) {
  if (language !== 'it') return null;
  return {
    ...ITALIAN_HELP_CALL_OFFER,
    whatsappUrl: buildSupportWhatsAppUrl(ITALIAN_HELP_CALL_OFFER.whatsappMessage),
  };
}

export function buildItalianHelpCallOfferHtml(language: SupportedLang): string {
  const offer = getItalianHelpCallOffer(language);
  if (!offer) return '';
  return `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin:24px 0">
      <h3 style="margin:0 0 8px;color:#166534">${offer.title}</h3>
      <p style="margin:0 0 14px">${offer.description}</p>
      <p style="margin:0 0 14px"><strong>WhatsApp: ${offer.whatsappNumberLabel}</strong></p>
      <a href="${offer.whatsappUrl}" style="display:inline-block;background:#168a55;color:#fff;text-decoration:none;padding:12px 18px;border-radius:7px;font-weight:bold">${offer.whatsappLabel}</a>
    </div>`;
}

export function buildItalianHelpCallOfferText(language: SupportedLang): string {
  const offer = getItalianHelpCallOffer(language);
  if (!offer) return '';
  return `${offer.title}\n${offer.description}\nWhatsApp: ${offer.whatsappNumberLabel}\n${offer.whatsappLabel}: ${offer.whatsappUrl}`;
}

export function buildItalianSetupServiceOfferHtml(language: SupportedLang): string {
  if (language !== 'it') return '';
  const whatsappUrl = buildSupportWhatsAppUrl(ITALIAN_SETUP_SERVICE_OFFER.whatsappMessage);
  return `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px;margin:24px 0">
      <h3 style="margin:0 0 8px;color:#1d4ed8">${ITALIAN_SETUP_SERVICE_OFFER.title}</h3>
      <p style="margin:0 0 10px">${ITALIAN_SETUP_SERVICE_OFFER.description}</p>
      <p style="margin:0 0 14px"><strong>${ITALIAN_SETUP_SERVICE_OFFER.priceLabel}</strong></p>
      <a href="${whatsappUrl}" style="display:inline-block;background:#168a55;color:#fff;text-decoration:none;padding:12px 18px;border-radius:7px;font-weight:bold">${ITALIAN_SETUP_SERVICE_OFFER.whatsappCta}</a>
    </div>`;
}

export function buildItalianSetupServiceOfferText(language: SupportedLang): string {
  if (language !== 'it') return '';
  const whatsappUrl = buildSupportWhatsAppUrl(ITALIAN_SETUP_SERVICE_OFFER.whatsappMessage);
  return `${ITALIAN_SETUP_SERVICE_OFFER.title}\n${ITALIAN_SETUP_SERVICE_OFFER.description}\n${ITALIAN_SETUP_SERVICE_OFFER.priceLabel}\n${ITALIAN_SETUP_SERVICE_OFFER.whatsappCta}: ${whatsappUrl}`;
}

export function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] as string);
}
