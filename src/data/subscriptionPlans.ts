import type { ProviderProfile, SubscriptionPlan } from '@/types';

export type SubscriptionPlanDefinition = {
  id: SubscriptionPlan;
  name: string;
  price: number;
  cityLimit: number | null;
  monthlyServiceLimit: number | null;
  badge?: string;
  popular?: boolean;
  features: string[];
};

export const subscriptionPlans: SubscriptionPlanDefinition[] = [
  {
    id: 'gratuito',
    name: 'Gratuito',
    price: 0,
    cityLimit: 2,
    monthlyServiceLimit: 5,
    features: [
      'Até 5 atendimentos ou novas propostas por ciclo',
      'Atuação em até 2 cidades',
      'Perfil profissional básico',
      'Ordenação padrão por avaliação',
    ],
  },
  {
    id: 'profissional',
    name: 'Profissional',
    price: 19.9,
    cityLimit: 5,
    monthlyServiceLimit: null,
    badge: 'Profissional Verificado',
    popular: true,
    features: [
      'Atendimentos e propostas ilimitados',
      'Atuação em até 5 cidades',
      'Selo azul de profissional verificado',
      'Prioridade sobre perfis gratuitos',
      'Gráficos e relatórios financeiros completos',
    ],
  },
  {
    id: 'premium',
    name: 'Premium / PJ',
    price: 39.9,
    cityLimit: null,
    monthlyServiceLimit: null,
    badge: 'Selo Premium / PJ',
    features: [
      'Atendimentos e propostas ilimitados',
      'Cidades de atuação ilimitadas',
      'Topo absoluto nas buscas',
      'Card dourado e vitrine física para empresas',
      'Agenda avançada e relatórios em PDF',
      'Suporte VIP direto via WhatsApp',
    ],
  },
];

export const planPriority: Record<SubscriptionPlan, number> = {
  gratuito: 0,
  profissional: 1,
  premium: 2,
};

export function getSubscriptionPlan(plan: SubscriptionPlan) {
  return subscriptionPlans.find((item) => item.id === plan) ?? subscriptionPlans[0];
}

export function getPlanCityLimit(plan: SubscriptionPlan) {
  return getSubscriptionPlan(plan).cityLimit;
}

export function hasReachedMonthlyServiceLimit(provider: ProviderProfile) {
  const refreshed = getProviderWithRefreshedCycle(provider);
  const limit = getSubscriptionPlan(refreshed.currentPlan).monthlyServiceLimit;
  return limit !== null && refreshed.currentMonthServices >= limit;
}

export function getProviderWithRefreshedCycle(
  provider: ProviderProfile,
  now = new Date(),
): ProviderProfile {
  const lastReset = new Date(provider.lastUsageResetAt);
  const elapsed = now.getTime() - lastReset.getTime();
  if (!Number.isFinite(lastReset.getTime()) || elapsed >= 30 * 24 * 60 * 60 * 1000) {
    return {
      ...provider,
      currentMonthServices: 0,
      lastUsageResetAt: now.toISOString(),
    };
  }
  return provider;
}

export function sortProvidersByPlan<T extends Pick<ProviderProfile, 'currentPlan' | 'rating' | 'reviewCount'>>(
  providers: T[],
) {
  return [...providers].sort((a, b) => {
    const planDifference = planPriority[b.currentPlan] - planPriority[a.currentPlan];
    if (planDifference) return planDifference;
    const ratingDifference = b.rating - a.rating;
    if (ratingDifference) return ratingDifference;
    return b.reviewCount - a.reviewCount;
  });
}
