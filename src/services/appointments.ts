import { requireSupabase } from '@/lib/supabase';
import type { Appointment, AppointmentItem, AppointmentStatus, CancellationReason, PaymentMethod, SelectedItem } from '@/types';

type AppointmentRow = {
  id: string; client_id: string; provider_id: string; scheduled_at: string; details: string;
  status: AppointmentStatus; final_amount: number | null; payment_method: PaymentMethod | null;
  completed_at: string | null; created_at: string; rejection_reason: string | null;
  client: { full_name: string } | null;
  provider: { profession: string; profile: { full_name: string } | null } | null;
  appointment_items: { catalog_item_id: string; quantity: number; name: string; description: string;
    kind: 'product' | 'service'; unit_cost: number; unit_price: number }[];
  appointment_finances: { total_cost: number | null } | null;
  reviews?: { reviewer_role: string }[];
};
export function mapAppointment(row: AppointmentRow): Appointment {
  const items: AppointmentItem[] = (row.appointment_items ?? []).map((item) => ({
    catalogItemId: item.catalog_item_id, quantity: Number(item.quantity), name: item.name,
    description: item.description, kind: item.kind, unitCost: Number(item.unit_cost), unitPrice: Number(item.unit_price),
  }));
  return { id: row.id, clientId: row.client_id, providerId: row.provider_id,
    clientName: row.client?.full_name ?? 'Cliente', providerName: row.provider?.profile?.full_name ?? 'Prestador',
    service: row.provider?.profession ?? 'Atendimento', scheduledAt: row.scheduled_at, details: row.details,
    status: row.status, finalAmount: row.final_amount == null ? undefined : Number(row.final_amount),
    paymentMethod: row.payment_method ?? undefined, completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at, rejectionReason: row.rejection_reason ?? undefined,
    clientReviewed: row.reviews?.some((review) => review.reviewer_role === 'client') ?? false,
    providerReviewed: row.reviews?.some((review) => review.reviewer_role === 'provider') ?? false, items,
    totalCost: row.appointment_finances?.total_cost == null ? undefined : Number(row.appointment_finances.total_cost) };
}

export const appointmentsService = {
  async listForProvider(): Promise<Appointment[]> {
    const client = requireSupabase();
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) throw new Error('Entre novamente para carregar os atendimentos.');
    const rows: Appointment[] = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await client.from('appointments').select(
        '*, client:profiles!appointments_client_id_fkey(full_name), provider:provider_profiles!appointments_provider_id_fkey(profession, profile:profiles!provider_profiles_user_id_fkey(full_name)), appointment_items(*), appointment_finances(total_cost), reviews(reviewer_role)',
      ).eq('provider_id', auth.user.id).order('scheduled_at', { ascending: false }).order('id')
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error(error.message);
      rows.push(...(data as unknown as AppointmentRow[]).map(mapAppointment));
      if (data.length < pageSize) return rows;
    }
  },
  async listMine() {
    const client = requireSupabase();
    const { data, error } = await client
      .from('appointments')
      .select(
        '*, client:profiles!appointments_client_id_fkey(full_name, avatar_url), provider:provider_profiles!appointments_provider_id_fkey(profession, profile:profiles!provider_profiles_user_id_fkey(full_name, avatar_url))',
      )
      .order('scheduled_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  },

  async request(providerId: string, scheduledAt: string, details: string) {
    const client = requireSupabase();
    const { data, error } = await client.rpc('request_appointment', {
      p_provider_id: providerId,
      p_scheduled_at: scheduledAt,
      p_details: details,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async respond(
    appointmentId: string,
    decision: Extract<AppointmentStatus, 'accepted' | 'declined'>,
    rejectionReason?: string,
  ) {
    const client = requireSupabase();
    const { data, error } = await client.rpc('respond_to_appointment', {
      p_appointment_id: appointmentId,
      p_decision: decision,
      p_rejection_reason: rejectionReason ?? null,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async complete(
    appointmentId: string,
    finalAmount: number,
    paymentMethod: PaymentMethod,
    items: SelectedItem[] = [],
  ) {
    const client = requireSupabase();
    const { data, error } = await client.rpc('complete_appointment_with_items', {
      p_appointment_id: appointmentId,
      p_final_amount: finalAmount,
      p_payment_method: paymentMethod,
      p_items: items.map((item) => ({ catalog_item_id: item.catalogItemId, quantity: item.quantity })),
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async cancel(
    appointmentId: string,
    reason: CancellationReason,
    justification?: string,
  ) {
    const client = requireSupabase();
    const { data, error } = await client.rpc('cancel_appointment', {
      p_appointment_id: appointmentId,
      p_reason: reason,
      p_justification: justification?.trim() || null,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async review(appointmentId: string, rating: number, comment?: string) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('reviews')
      .insert({
        appointment_id: appointmentId,
        rating,
        comment: comment?.trim() || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
};
