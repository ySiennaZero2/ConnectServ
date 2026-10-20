import { apiError, json } from '@/server/apiResponse';
import {
  getOrder,
  getOrderStatus,
  isMercadoPagoOrderId,
  validateWebhookSignature,
} from '@/server/mercadopagoService';
import { activateApprovedOrder, readOrderIdentity, recordOrder } from '@/server/subscriptionPayments';
import { getSupabaseAdmin } from '@/server/supabaseAdmin';

type WebhookBody = { data?: { id?: string }; id?: string | number; type?: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as WebhookBody;
    const url = new URL(request.url);
    const orderId = String(body.data?.id ?? url.searchParams.get('data.id') ?? '');
    if (body.type !== 'order' || !isMercadoPagoOrderId(orderId)) return json({ received: true });

    validateWebhookSignature(request, orderId);
    const order = await getOrder(orderId);
    const { providerId, plan } = readOrderIdentity(order);
    const admin = getSupabaseAdmin();
    await recordOrder(admin, order, providerId, plan);
    const activated = await activateApprovedOrder(admin, order, providerId, plan);

    console.info(JSON.stringify({
      event: 'mercadopago_webhook_processed', requestId: request.headers.get('x-request-id'),
      orderId, providerId, plan, status: getOrderStatus(order), activated, timestamp: new Date().toISOString(),
    }));
    return json({ received: true });
  } catch (error) {
    return apiError(error, 'webhooks.mercadopago');
  }
}
