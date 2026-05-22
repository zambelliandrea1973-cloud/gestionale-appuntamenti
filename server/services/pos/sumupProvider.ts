import axios from 'axios';
import type { IPosProvider, PosCheckout, PosCheckoutParams, PosWebhookEvent } from './types';

const SUMUP_API = 'https://api.sumup.com';

export class SumUpProvider implements IPosProvider {
  readonly name = 'sumup';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private get headers() {
    return { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' };
  }

  async getMerchantCode(): Promise<string> {
    const res = await axios.get(`${SUMUP_API}/v0.1/me`, { headers: this.headers });
    return res.data.merchant_profile?.merchant_code || '';
  }

  async createCheckout(params: PosCheckoutParams): Promise<PosCheckout> {
    const body = {
      checkout_reference: params.reference,
      amount: params.amount,
      currency: params.currency,
      description: params.description || params.reference,
    };

    const res = await axios.post(`${SUMUP_API}/v0.1/checkouts`, body, { headers: this.headers });
    const data = res.data;

    return {
      checkoutId: data.id,
      checkoutUrl: `https://pay.sumup.com/b2c/${data.id}`,
      reference: params.reference,
      amount: params.amount,
      currency: params.currency,
      status: data.status === 'PAID' ? 'PAID' : 'PENDING',
    };
  }

  async getCheckoutStatus(checkoutId: string): Promise<'PENDING' | 'PAID' | 'FAILED'> {
    const res = await axios.get(`${SUMUP_API}/v0.1/checkouts/${checkoutId}`, { headers: this.headers });
    const s = res.data.status;
    if (s === 'PAID') return 'PAID';
    if (s === 'FAILED') return 'FAILED';
    return 'PENDING';
  }

  parseWebhookEvent(body: any): PosWebhookEvent {
    return {
      checkoutId: body.id,
      reference: body.checkout_reference || '',
      status: body.status === 'PAID' ? 'PAID' : 'FAILED',
      transactionId: body.transaction_id || body.transaction_code,
    };
  }
}
