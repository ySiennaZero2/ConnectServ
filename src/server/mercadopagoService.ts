import {
  MercadoPagoConfig,
  Order,
  WebhookSignatureValidator,
} from 'mercadopago';

import type { SubscriptionPlan } from '@/types';

export type PaidPlan = Exclude<SubscriptionPlan, 'gratuito'>;
export type CheckoutPaymentMethod = 'pix' | 'cartao';

const PAID_PLANS: Record<PaidPlan, { amount: number; label: string }> = {
  profissional: { amount: 19.9, label: 'Plano Profissional ConectaServ' },
  premium: { amount: 39.9, label: 'Plano Premium ConectaServ' },
};

const DEVELOPMENT_CHARGE_AMOUNT = 50;
const ORDER_ID_PATTERN = /^ORD[A-Z0-9]+$/i;

let orderClient: Order | null = null;

function requireMercadoPagoEnv(name: 'MERCADOPAGO_ACCESS_TOKEN' | 'MERCADOPAGO_PUBLIC_KEY') {
  const value = process.env[name]?.trim();
  if (!value || value.includes('seu-token') || value.includes('sua-chave')) {
    throw new Error(`Variavel de servidor ${name} nao configurada.`);
  }
  return value;
}

export function assertMercadoPagoServerConfig() {
  const accessToken = requireMercadoPagoEnv('MERCADOPAGO_ACCESS_TOKEN');
  if (accessToken.length < 20) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN possui formato invalido.');
  }

  return {
    accessTokenLoaded: true as const,
    environment: isProductionEnvironment() ? 'production' as const : 'test' as const,
  };
}

function getOrderClient() {
  if (!orderClient) {
    assertMercadoPagoServerConfig();
    orderClient = new Order(
      new MercadoPagoConfig({ accessToken: requireMercadoPagoEnv('MERCADOPAGO_ACCESS_TOKEN') }),
    );
  }
  return orderClient;
}

export function isPaidPlan(value: unknown): value is PaidPlan {
  return value === 'profissional' || value === 'premium';
}

export function getServerPlan(plan: PaidPlan) {
  return {
    ...PAID_PLANS[plan],
    officialAmount: PAID_PLANS[plan].amount,
    amount: getChargeAmount(plan),
  };
}

export function isProductionEnvironment() {
  const flag = process.env.IS_PRODUCTION?.trim().toLowerCase();
  if (flag !== 'true' && flag !== 'false') {
    throw new Error('Variavel de servidor IS_PRODUCTION deve ser true ou false.');
  }
  return flag === 'true';
}

export function getChargeAmount(plan: PaidPlan) {
  return isProductionEnvironment() ? PAID_PLANS[plan].amount : DEVELOPMENT_CHARGE_AMOUNT;
}

export function getMercadoPagoPublicKey() {
  return requireMercadoPagoEnv('MERCADOPAGO_PUBLIC_KEY');
}

export function orderExternalReference(providerId: string, plan: PaidPlan) {
  const reference = `conectaserv-${providerId}-${plan}`
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 64);
  if (!reference) throw new Error('Nao foi possivel gerar a referencia externa da order.');
  return reference;
}

type Payer = {
  email: string;
  first_name: string;
  identification?: { type: 'CPF' | 'CNPJ'; number: string };
};

type CardPaymentInput = Payer & {
  token: string;
  paymentMethodId: string;
  issuerId?: number;
  installments: number;
};

function amountAsDecimal(plan: PaidPlan) {
  return getChargeAmount(plan).toFixed(2);
}

function orderPayer(payer: Payer) {
  return {
    email: payer.email.trim().toLowerCase(),
    first_name: isProductionEnvironment() ? payer.first_name.trim() : 'APRO',
    identification: payer.identification,
  };
}

function assertValidPayer(payer: Payer) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payer.email)) {
    throw new Error('payer.email da order e invalido.');
  }
  if (!payer.first_name.trim()) {
    throw new Error('payer.first_name da order e obrigatorio.');
  }
}

function commonOrderBody(providerId: string, plan: PaidPlan) {
  return {
    type: 'online',
    processing_mode: 'automatic',
    total_amount: amountAsDecimal(plan),
    description: PAID_PLANS[plan].label,
    external_reference: orderExternalReference(providerId, plan),
  };
}

export async function createPixOrder(
  providerId: string,
  plan: PaidPlan,
  payer: Payer,
  idempotencyKey: string,
) {
  assertMercadoPagoServerConfig();
  assertValidPayer(payer);
  const payment = {
    amount: amountAsDecimal(plan),
    payment_method: {
      id: 'pix',
      type: 'bank_transfer',
    },
    ...(isProductionEnvironment() ? { expiration_time: 'PT30M' } : {}),
  };

  return getOrderClient().create({
    body: {
      ...commonOrderBody(providerId, plan),
      payer: orderPayer(payer),
      transactions: { payments: [payment] },
    },
    requestOptions: { idempotencyKey },
  });
}

export async function createCardOrder(
  providerId: string,
  plan: PaidPlan,
  input: CardPaymentInput,
  idempotencyKey: string,
) {
  assertValidPayer(input);
  return getOrderClient().create({
    body: {
      ...commonOrderBody(providerId, plan),
      payer: orderPayer(input),
      transactions: {
        payments: [
          {
            amount: amountAsDecimal(plan),
            payment_method: {
              id: input.paymentMethodId,
              type: 'credit_card',
              token: input.token,
              installments: input.installments,
            },
          },
        ],
      },
    },
    requestOptions: { idempotencyKey },
  });
}

export function isMercadoPagoOrderId(value: string) {
  return ORDER_ID_PATTERN.test(value);
}

export function getOrder(orderId: string) {
  if (!isMercadoPagoOrderId(orderId)) throw new Error('Identificador da order invalido.');
  return getOrderClient().get({ id: orderId });
}

export type MercadoPagoOrder = Awaited<ReturnType<typeof getOrder>>;

export function getOrderPayment(order: MercadoPagoOrder) {
  return order.transactions?.payments?.[0];
}

function normalizeStatus(status?: string) {
  if (!status) return 'pending';
  if (['approved', 'accredited', 'processed'].includes(status)) return 'approved';
  if (['action_required', 'created', 'processing'].includes(status)) return 'pending';
  return status;
}

export function getOrderStatus(order: MercadoPagoOrder) {
  return normalizeStatus(getOrderPayment(order)?.status ?? order.status);
}

export function getOrderStatusDetail(order: MercadoPagoOrder) {
  return getOrderPayment(order)?.status_detail ?? order.status_detail;
}

export function isOrderApproved(order: MercadoPagoOrder) {
  return getOrderStatus(order) === 'approved';
}

export function validateWebhookSignature(request: Request, orderId: string) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  const signature = request.headers.get('x-signature');
  const placeholderSecret = !secret || secret.includes('sua-assinatura');
  if (isProductionEnvironment() && placeholderSecret) {
    throw new Error('MERCADOPAGO_WEBHOOK_SECRET e obrigatoria em producao.');
  }
  if (placeholderSecret || !signature) return;

  WebhookSignatureValidator.validate({
    xSignature: signature,
    xRequestId: request.headers.get('x-request-id'),
    dataId: orderId,
    secret,
    toleranceSeconds: 300,
  });
}

export function parseOrderIdentity(order: MercadoPagoOrder) {
  const match = /^conectaserv-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(profissional|premium)$/i.exec(
    order.external_reference ?? '',
  );
  if (!match || !isPaidPlan(match[2])) return null;
  return { providerId: match[1], plan: match[2] };
}

export function validateOrderOwnership(
  order: MercadoPagoOrder,
  providerId: string,
  plan: PaidPlan,
) {
  const expected = getChargeAmount(plan);
  return (
    order.external_reference === orderExternalReference(providerId, plan) &&
    Math.round(Number(order.total_amount) * 100) === Math.round(expected * 100)
  );
}
