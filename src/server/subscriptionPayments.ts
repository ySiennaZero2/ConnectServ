import type { SupabaseClient } from '@supabase/supabase-js';

import {
  getOrderPayment,
  getOrderStatus,
  getServerPlan,
  isOrderApproved,
  isPaidPlan,
  parseOrderIdentity,
  validateOrderOwnership,
  type CheckoutPaymentMethod,
  type MercadoPagoOrder,
  type PaidPlan,
} from '@/server/mercadopagoService';

export function readOrderIdentity(order: MercadoPagoOrder) {
  const identity = parseOrderIdentity(order);
  if (!identity || !isPaidPlan(identity.plan)) {
    throw new Error('Order sem referencia valida do ConectaServ.');
  }
  if (!validateOrderOwnership(order, identity.providerId, identity.plan)) {
    throw new Error('Order recusada por divergencia de titularidade, plano ou valor.');
  }
  return identity;
}

export function paymentMethodFromOrder(order: MercadoPagoOrder): CheckoutPaymentMethod {
  return getOrderPayment(order)?.payment_method?.id === 'pix' ? 'pix' : 'cartao';
}

export async function recordOrder(
  admin: SupabaseClient,
  order: MercadoPagoOrder,
  providerId: string,
  plan: PaidPlan,
) {
  if (!order.id) throw new Error('Mercado Pago nao retornou o identificador da order.');
  const status = getOrderStatus(order);
  const row =
    {
      prestador_id: providerId,
      mercadopago_payment_id: order.id,
      valor: getServerPlan(plan).amount,
      plano: plan,
      metodo_pagamento: paymentMethodFromOrder(order),
      status,
      data_pagamento: status === 'approved' ? order.last_updated_date ?? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
  const { error: insertError } = await admin.from('historico_pagamentos').insert(row);
  if (insertError && insertError.code !== '23505') {
    throw new Error(`Falha ao registrar auditoria do pagamento: ${insertError.message}`);
  }
  if (insertError?.code === '23505') {
    const { error: updateError } = await admin
      .from('historico_pagamentos')
      .update({ status, data_pagamento: row.data_pagamento, updated_at: row.updated_at })
      .eq('mercadopago_payment_id', row.mercadopago_payment_id)
      .eq('prestador_id', providerId)
      .eq('plano', plan)
      .eq('valor', getServerPlan(plan).amount);
    if (updateError) throw new Error(`Falha ao atualizar auditoria: ${updateError.message}`);
  }
}

export async function activateApprovedOrder(
  admin: SupabaseClient,
  order: MercadoPagoOrder,
  providerId: string,
  plan: PaidPlan,
) {
  if (!isOrderApproved(order) || !order.id) return false;
  if (!validateOrderOwnership(order, providerId, plan)) {
    throw new Error('Order aprovada com dados divergentes. Ativacao bloqueada.');
  }

  const { error } = await admin.rpc('activate_subscription_from_payment', {
    p_provider_id: providerId,
    p_payment_id: order.id,
    p_plan: plan,
    p_amount: getServerPlan(plan).amount,
    p_method: paymentMethodFromOrder(order),
    p_status: 'approved',
    p_paid_at: order.last_updated_date ?? new Date().toISOString(),
  });
  if (error) throw new Error(`Falha ao ativar plano: ${error.message}`);
  return true;
}

export async function cancelProviderSubscription(
  admin: SupabaseClient,
  providerId: string,
  serviceCities: string[],
) {
  const { data, error } = await admin
    .from('provider_profiles')
    .update({
      plano_atual: 'gratuito',
      service_cities: serviceCities.slice(0, 2),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', providerId)
    .neq('plano_atual', 'gratuito')
    .select('user_id')
    .single();
  if (error || !data) throw new Error(`Falha ao cancelar assinatura: ${error?.message ?? 'plano não alterado'}`);
}
