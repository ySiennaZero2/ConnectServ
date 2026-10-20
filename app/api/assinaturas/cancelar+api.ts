import { apiError, json } from '@/server/apiResponse';
import { cancelProviderSubscription } from '@/server/subscriptionPayments';
import { authenticateProviderRequest } from '@/server/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { admin, user } = await authenticateProviderRequest(request);
    const { data: rawProvider, error: providerError } = await admin
      .from('provider_profiles')
      .select('user_id, plano_atual, atendimentos_mes_atual, service_cities')
      .eq('user_id', user.id)
      .single();
    const provider = rawProvider as unknown as {
      user_id: string;
      plano_atual: 'gratuito' | 'profissional' | 'premium';
      atendimentos_mes_atual: number;
      service_cities: string[];
    } | null;

    if (providerError || !provider) return json({ error: 'Perfil profissional não encontrado.' }, 404);
    if (provider.plano_atual === 'gratuito') {
      return json({ error: 'Sua conta já está no Plano Gratuito.' }, 409);
    }

    await cancelProviderSubscription(admin, user.id, provider.service_cities);

    console.info(
      JSON.stringify({
        event: 'subscription_cancelled',
        providerId: user.id,
        previousPlan: provider.plano_atual,
        currentMonthServices: provider.atendimentos_mes_atual,
        timestamp: new Date().toISOString(),
      }),
    );
    return json({
      plan: 'gratuito',
      currentMonthServices: provider.atendimentos_mes_atual,
      monthlyServiceLimit: 5,
    });
  } catch (error) {
    return apiError(error, 'assinaturas.cancelar');
  }
}
