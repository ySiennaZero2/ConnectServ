import { router, type Href } from 'expo-router';
import { MessageSquareQuote, UsersRound } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { CommunityChatScreen } from '@/components/community/CommunityChatScreen';
import { CommunityPostCard } from '@/components/community/CommunityPostCard';
import { PlanLimitModal } from '@/components/subscriptions/PlanLimitModal';
import { EmptyState } from '@/components/common/EmptyState';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import { hasReachedMonthlyServiceLimit } from '@/data/subscriptionPlans';
import { isSupabaseConfigured } from '@/lib/supabase';
import { serviceRequestsService } from '@/services/serviceRequests';
import { useAppStore } from '@/store/useAppStore';
import type { ServiceQuote } from '@/types';

export default function ProviderCommunityScreen() {
  const currentUser = useAppStore((state) => state.currentUser);
  const provider = useAppStore((state) =>
    state.providers.find((item) => item.id === state.currentUser?.id),
  );
  const serviceRequests = useAppStore((state) => state.serviceRequests);
  const serviceQuotes = useAppStore((state) => state.serviceQuotes);
  const submitServiceQuote = useAppStore((state) => state.submitServiceQuote);
  const [chatQuote, setChatQuote] = useState<ServiceQuote | null>(null);
  const [planLimitVisible, setPlanLimitVisible] = useState(false);

  const posts = useMemo(() => {
    if (!provider) return [];
    return serviceRequests
      .filter(
        (request) =>
          request.status === 'open' &&
          provider.serviceCities.some((city) => city === request.city),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [provider, serviceRequests]);

  if (!provider) return null;
  const chatRequest = serviceRequests.find((request) => request.id === chatQuote?.requestId);
  if (chatQuote && chatRequest) {
    return (
      <CommunityChatScreen
        request={chatRequest}
        quote={chatQuote}
        provider={provider}
        onBack={() => setChatQuote(null)}
      />
    );
  }
  const canSendProposal = provider.agendaOpen && !provider.profileHidden;

  return (
    <Screen className="bg-slate-50">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-8">
        <View className="pb-4 pt-5">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-700">
              <UsersRound size={24} color={colors.white} />
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-black text-slate-950">Comunidade</Text>
              <Text className="mt-0.5 text-sm text-slate-500">
                Ordens de serviço publicadas na sua região.
              </Text>
            </View>
            <View className="rounded-full bg-brand-50 px-3 py-1.5">
              <Text className="text-xs font-black text-brand-700">{posts.length}</Text>
            </View>
          </View>

          <View className="mt-5 flex-row flex-wrap gap-2">
            {provider.serviceCities.map((city) => (
              <View key={city} className="rounded-full bg-white px-3 py-2">
                <Text className="text-xs font-bold text-slate-600">{city}</Text>
              </View>
            ))}
          </View>

          {!canSendProposal ? (
            <View className="mt-4 rounded-2xl bg-amber-50 p-4">
              <Text className="font-extrabold text-amber-800">Envio de propostas pausado</Text>
              <Text className="mt-1 text-xs leading-5 text-amber-700">
                Abra sua agenda e desative o modo férias para demonstrar interesse.
              </Text>
            </View>
          ) : null}
        </View>

        {posts.length ? (
          posts.map((request) => {
            const existingQuote = serviceQuotes.find(
              (quote) =>
                quote.requestId === request.id && quote.providerId === currentUser?.id,
            );
            return (
              <CommunityPostCard
                key={request.id}
                request={request}
                existingQuote={existingQuote}
                onClientPress={() =>
                  router.push({
                    pathname: '/(provider)/client/[clientId]',
                    params: { clientId: request.clientId },
                  } as unknown as Href)
                }
                onOpenChat={existingQuote ? () => setChatQuote(existingQuote) : undefined}
                onSubmitProposal={async (amount, message) => {
                  if (!canSendProposal) return 'failed';
                  if (!existingQuote && hasReachedMonthlyServiceLimit(provider)) {
                    setPlanLimitVisible(true);
                    return 'blocked';
                  }
                  const input = {
                    requestId: request.id,
                    amount,
                    estimatedDuration: 'A combinar no chat',
                    message,
                    includesMaterials: false,
                  };
                  try {
                    if (isSupabaseConfigured) await serviceRequestsService.submitQuote(input);
                    const quote = submitServiceQuote(input);
                    if (!quote && !existingQuote && hasReachedMonthlyServiceLimit(provider)) {
                      setPlanLimitVisible(true);
                    }
                    return quote ? 'submitted' : 'failed';
                  } catch (error) {
                    if (error instanceof Error && error.message.includes('LIMIT_MONTHLY_FREE_PLAN')) {
                      setPlanLimitVisible(true);
                      return 'blocked';
                    }
                    return 'failed';
                  }
                }}
              />
            );
          })
        ) : (
          <EmptyState
            icon={<MessageSquareQuote size={28} color={colors.brand700} />}
            title="Nenhuma publicação na sua região"
            description="Novas ordens de serviço das cidades que você atende aparecerão aqui."
          />
        )}
      </ScrollView>
      <PlanLimitModal
        visible={planLimitVisible}
        onClose={() => setPlanLimitVisible(false)}
        onViewPlans={() => {
          setPlanLimitVisible(false);
          router.push('/(provider)/plans' as unknown as Href);
        }}
      />
    </Screen>
  );
}
