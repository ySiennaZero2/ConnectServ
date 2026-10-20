import { apiError, json } from '@/server/apiResponse';
import {
  getOrder,
  getOrderStatus,
  getOrderStatusDetail,
  isMercadoPagoOrderId,
  isPaidPlan,
  parseOrderIdentity,
  validateOrderOwnership,
} from '@/server/mercadopagoService';
import { activateApprovedOrder, recordOrder } from '@/server/subscriptionPayments';
import { authenticateProviderRequest } from '@/server/supabaseAdmin';

export async function GET(request: Request) {
  try {
    const { admin, user } = await authenticateProviderRequest(request);
    const orderId = new URL(request.url).searchParams.get('orderId');
    if (!orderId || !isMercadoPagoOrderId(orderId)) return json({ error: 'Order invalida.' }, 400);

    const order = await getOrder(orderId);
    const identity = parseOrderIdentity(order);
    const plan = identity?.plan;
    if (!isPaidPlan(plan) || !validateOrderOwnership(order, user.id, plan)) {
      return json({ error: 'Order nao pertence ao prestador autenticado.' }, 403);
    }

    await recordOrder(admin, order, user.id, plan);
    const activated = await activateApprovedOrder(admin, order, user.id, plan);
    return json({
      orderId,
      status: getOrderStatus(order),
      statusDetail: getOrderStatusDetail(order),
      activated,
      plan,
    });
  } catch (error) {
    return apiError(error, 'assinaturas.status');
  }
}
