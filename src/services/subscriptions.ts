import { Platform } from 'react-native';

import { requireSupabase } from '@/lib/supabase';
import type { SubscriptionPlan } from '@/types';

export type PaidPlan = Exclude<SubscriptionPlan, 'gratuito'>;
export type CheckoutMethod = 'pix' | 'cartao';

export type CardTokenData = {
  token: string;
  paymentMethodId: string;
  issuerId?: string | number;
  installments: number;
};

export type CheckoutResponse = {
  orderId: string;
  transactionId?: string;
  status: string;
  statusDetail?: string;
  activated: boolean;
  qrCodeBase64?: string;
  pixCopyPaste?: string;
};

function apiUrl(path: string) {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (configured) return `${configured}${path}`;
  if (Platform.OS === 'web') return path;
  throw new Error('Configure EXPO_PUBLIC_API_BASE_URL para acessar o servidor de pagamentos.');
}

async function accessToken() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sessao expirada. Entre novamente.');
  return data.session.access_token;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Falha na comunicacao com o pagamento.');
  return payload;
}

export const subscriptionsService = {
  async getConfig() {
    const response = await fetch(apiUrl('/api/assinaturas/config'));
    return parseResponse<{
      publicKey: string;
      checkoutAmounts: Record<PaidPlan, number>;
    }>(response);
  },

  async checkout(input: {
    plan: PaidPlan;
    method: CheckoutMethod;
    card?: CardTokenData;
  }) {
    const token = await accessToken();
    const response = await fetch(apiUrl('/api/assinaturas/checkout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        planoDesejado: input.plan,
        metodoPagamento: input.method,
        ...(input.card ? { cartao: input.card } : {}),
      }),
    });
    return parseResponse<CheckoutResponse>(response);
  },

  async getStatus(orderId: string) {
    const token = await accessToken();
    const response = await fetch(
      apiUrl(`/api/assinaturas/status?orderId=${encodeURIComponent(orderId)}`),
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return parseResponse<{
      orderId: string;
      status: string;
      statusDetail?: string;
      activated: boolean;
      plan: PaidPlan;
    }>(response);
  },

  async cancel() {
    const token = await accessToken();
    const response = await fetch(apiUrl('/api/assinaturas/cancelar'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return parseResponse<{
      plan: 'gratuito';
      currentMonthServices: number;
      monthlyServiceLimit: 5;
    }>(response);
  },
};
