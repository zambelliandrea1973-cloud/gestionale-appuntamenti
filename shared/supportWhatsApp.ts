export const SUPPORT_WHATSAPP_NUMBER = "393472550110";

export function buildSupportWhatsAppUrl(message: string): string {
  const url = new URL(`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`);
  url.searchParams.set("text", message);
  return url.toString();
}
