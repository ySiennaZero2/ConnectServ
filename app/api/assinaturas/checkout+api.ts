import { apiError, json } from '@/server/apiResponse';
import {
  assertMercadoPagoServerConfig,
  createCardOrder,
  createPixOrder,
  getOrderPayment,
  getOrderStatus,
  getOrderStatusDetail,
  isPaidPlan,
  isProductionEnvironment,
  type CheckoutPaymentMethod,
} from '@/server/mercadopagoService';
import { activateApprovedOrder, recordOrder } from '@/server/subscriptionPayments';
import { ApiAuthError, authenticateProviderRequest } from '@/server/supabaseAdmin';

type CheckoutBody = {
  planoDesejado?: unknown;
  metodoPagamento?: unknown;
  cartao?: {
    token?: unknown;
    paymentMethodId?: unknown;
    issuerId?: unknown;
    installments?: unknown;
  };
};

const methods = new Set<CheckoutPaymentMethod>(['pix', 'cartao']);

function getPayerEmail(authenticatedEmail: string, providerId: string) {
  if (isProductionEnvironment()) return authenticatedEmail;

  const configuredTestBuyer = process.env.MERCADOPAGO_TEST_PAYER_EMAIL?.trim().toLowerCase();
  if (configuredTestBuyer) return configuredTestBuyer;

  // Evita cobrar a própria conta vendedora durante os testes locais.
  const suffix = providerId.replace(/[^a-z0-9]/gi, '').slice(0, 12).toLowerCase();
  return `test_user_${suffix || 'conectaserv'}@testuser.com`;
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || 'Cliente';
}

type CheckoutSdkError = {
  response?: { data?: unknown; status?: number };
  message?: unknown;
  error?: unknown;
  status?: unknown;
  cause?: unknown;
};

function detailedErrorMessage(error: unknown) {
  const sdkError = error as CheckoutSdkError | null;
  const details = sdkError?.response?.data ?? error;
  if (details instanceof Error) return details.message;
  if (typeof details === 'string') return details;
  if (!details || typeof details !== 'object') return 'Erro interno inesperado.';

  const record = details as Record<string, unknown>;
  const summary = [record.error, record.message]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .join(': ');
  const causes = Array.isArray(record.cause)
    ? record.cause
        .map((cause) => {
          if (!cause || typeof cause !== 'object') return '';
          const item = cause as Record<string, unknown>;
          return [item.code, item.description]
            .filter((value) => typeof value === 'string' || typeof value === 'number')
            .join(' - ');
        })
        .filter(Boolean)
        .join('; ')
    : '';

  return [summary, causes].filter(Boolean).join(' | ') || JSON.stringify(details);
}

function detailedErrorStatus(error: unknown) {
  if (error instanceof ApiAuthError) return error.status;
  const sdkError = error as CheckoutSdkError | null;
  const status = Number(sdkError?.response?.status ?? sdkError?.status);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

export async function POST(request: Request) {
  try {
    const mercadoPagoConfig = assertMercadoPagoServerConfig();
    const { admin, user, profile } = await authenticateProviderRequest(request);
    const body = (await request.json()) as CheckoutBody;
    if (!isPaidPlan(body.planoDesejado)) return json({ error: 'Plano pago invalido.' }, 400);
    if (!methods.has(body.metodoPagamento as CheckoutPaymentMethod)) {
      return json({ error: 'Metodo de pagamento invalido.' }, 400);
    }

    const { data: rawProvider, error: providerError } = await admin
      .from('provider_profiles')
      .select('user_id, plano_atual, tipo_documento, cpf_cnpj')
      .eq('user_id', user.id)
      .single();
    const provider = rawProvider as unknown as {
      user_id: string;
      plano_atual: string;
      tipo_documento: 'CPF' | 'CNPJ';
      cpf_cnpj: string;
    } | null;
    if (providerError || !provider) return json({ error: 'Perfil profissional nao encontrado.' }, 404);
    if (provider.plano_atual === body.planoDesejado) {
      return json({ error: 'Este ja e o seu plano atual.' }, 409);
    }

    const authenticatedEmail = user.email?.trim().toLowerCase() ?? '';
    if (!authenticatedEmail) return json({ error: 'E-mail do prestador nao encontrado.' }, 400);

    const payer = {
      email: getPayerEmail(authenticatedEmail, user.id),
      first_name: firstName(profile.full_name),
      identification: {
        type: provider.tipo_documento as 'CPF' | 'CNPJ',
        number: String(provider.cpf_cnpj ?? '').replace(/\D/g, ''),
      },
    };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payer.email)) {
      return json({ error: 'E-mail do pagador invalido.' }, 400);
    }
    const expectedDocumentLength = payer.identification.type === 'CNPJ' ? 14 : 11;
    if (payer.identification.number.length !== expectedDocumentLength) {
      return json({ error: `${payer.identification.type} do prestador invalido ou incompleto.` }, 400);
    }

    const idempotencyKey = crypto.randomUUID();
    const installments = Number(body.cartao?.installments ?? 1);
    const issuerId =
      body.cartao?.issuerId == null || body.cartao.issuerId === ''
        ? undefined
        : Number(body.cartao.issuerId);
    if (
      body.metodoPagamento === 'cartao' &&
      (!body.cartao?.token ||
        !body.cartao.paymentMethodId ||
        !Number.isInteger(installments) ||
        installments < 1 ||
        installments > 24 ||
        (issuerId !== undefined && !Number.isFinite(issuerId)))
    ) {
      return json({ error: 'Token ou dados de processamento do cartao invalidos.' }, 400);
    }
    const order =
      body.metodoPagamento === 'pix'
        ? await createPixOrder(user.id, body.planoDesejado, payer, idempotencyKey)
        : await createCardOrder(
            user.id,
            body.planoDesejado,
            {
              ...payer,
              token: String(body.cartao?.token ?? ''),
              paymentMethodId: String(body.cartao?.paymentMethodId ?? ''),
              issuerId,
              installments,
            },
            idempotencyKey,
          );

    await recordOrder(admin, order, user.id, body.planoDesejado);
    const activated = await activateApprovedOrder(admin, order, user.id, body.planoDesejado);
    const transaction = getOrderPayment(order);
    const status = getOrderStatus(order);
    console.info(JSON.stringify({
      event: 'subscription_checkout_created', providerId: user.id, plan: body.planoDesejado,
      orderId: order.id, transactionId: transaction?.id, status, activated,
      payerSource: isProductionEnvironment() ? 'authenticated_session' : 'test_buyer',
      mercadoPagoEnvironment: mercadoPagoConfig.environment,
      timestamp: new Date().toISOString(),
    }));

    if (!order.id) throw new Error('Mercado Pago nao retornou o identificador da order.');
    const paymentMethod = transaction?.payment_method;
    return json({
      orderId: order.id,
      transactionId: transaction?.id,
      status,
      statusDetail: getOrderStatusDetail(order),
      activated,
      ...(body.metodoPagamento === 'pix'
        ? { qrCodeBase64: paymentMethod?.qr_code_base64, pixCopyPaste: paymentMethod?.qr_code }
        : {}),
    });
  } catch (error) {
    const sdkError = error as CheckoutSdkError | null;
    console.error('Erro detalhado no checkout:', sdkError?.response?.data || error);

    if (process.env.IS_PRODUCTION?.trim().toLowerCase() !== 'true') {
      return json(
        {
          error: detailedErrorMessage(error),
          environment: 'development',
        },
        detailedErrorStatus(error),
      );
    }
    return apiError(error, 'assinaturas.checkout');
  }
}
