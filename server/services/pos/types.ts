export interface PosCheckoutParams {
  amount: number;      // in euros (float, e.g. 50.00)
  currency: string;    // "EUR"
  reference: string;   // nostra ref interna, e.g. "POS-1234"
  description?: string;
}

export interface PosCheckout {
  checkoutId: string;
  checkoutUrl: string;  // URL per QR code / pagamento web
  reference: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
}

export interface PosWebhookEvent {
  checkoutId: string;
  reference: string;
  status: 'PAID' | 'FAILED';
  transactionId?: string;
}

export interface IPosProvider {
  readonly name: string;
  createCheckout(params: PosCheckoutParams): Promise<PosCheckout>;
  getCheckoutStatus(checkoutId: string): Promise<'PENDING' | 'PAID' | 'FAILED'>;
  parseWebhookEvent(body: any): PosWebhookEvent;
}
