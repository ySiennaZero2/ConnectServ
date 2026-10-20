import { router } from 'expo-router';
import { MessageCircle, MessageSquareQuote, Star, UsersRound } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';

import { CommunityChatScreen } from '@/components/community/CommunityChatScreen';
import { CommunityPostDetailsModal } from '@/components/community/CommunityPostDetailsModal';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Screen } from '@/components/common/Screen';
import { ServiceRequestCard } from '@/components/requests/ServiceRequestCard';
import { colors } from '@/constants/theme';
import { formatCurrency } from '@/data/paymentMethods';
import { useAppStore } from '@/store/useAppStore';
import type { ServiceQuote, ServiceRequest } from '@/types';

type CommunityTab = 'open' | 'proposals';

export default function ClientCommunityScreen() {
  const currentUser = useAppStore((state) => state.currentUser);
  const serviceRequests = useAppStore((state) => state.serviceRequests);
  const serviceQuotes = useAppStore((state) => state.serviceQuotes);
  const providers = useAppStore((state) => state.providers);
  const [activeTab, setActiveTab] = useState<CommunityTab>('open');
  const [chatQuote, setChatQuote] = useState<ServiceQuote | null>(null);
  const [selectedOwnPost, setSelectedOwnPost] = useState<ServiceRequest | null>(null);

  const handlePostPress = (post: ServiceRequest) => {
    if (post.clientId === currentUser?.id) {
      setSelectedOwnPost(post);
      return;
    }
    router.push({
      pathname: '/(client)/request/[requestId]',
      params: { requestId: post.id },
    });
  };

  const myPosts = useMemo(
    () =>
      serviceRequests
        .filter((request) => request.clientId === currentUser?.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [currentUser?.id, serviceRequests],
  );
  const openPosts = myPosts.filter(
    (request) =>
      request.status === 'open' &&
      !serviceQuotes.some((quote) => quote.requestId === request.id),
  );
  const proposals = serviceQuotes
    .filter(
      (quote) =>
        quote.status !== 'rejected' && myPosts.some((request) => request.id === quote.requestId),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const chatRequest = myPosts.find((request) => request.id === chatQuote?.requestId);
  const chatProvider = providers.find((provider) => provider.id === chatQuote?.providerId);
  if (chatQuote && chatRequest) {
    return (
      <CommunityChatScreen
        request={chatRequest}
        quote={chatQuote}
        provider={chatProvider}
        onBack={() => setChatQuote(null)}
      />
    );
  }

  return (
    <Screen className="bg-slate-50">
      <View className="bg-white px-5 pb-4 pt-5">
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-700">
            <UsersRound size={24} color={colors.white} />
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-black text-slate-950">Minha Comunidade</Text>
            <Text className="mt-0.5 text-sm text-slate-500">Seus posts e negociações.</Text>
          </View>
        </View>

        <View className="mt-5 flex-row rounded-2xl bg-slate-100 p-1">
          <ButtonTab
            label="Abertos"
            count={openPosts.length}
            selected={activeTab === 'open'}
            onPress={() => setActiveTab('open')}
          />
          <ButtonTab
            label="Propostas recebidas"
            count={proposals.length}
            selected={activeTab === 'proposals'}
            onPress={() => setActiveTab('proposals')}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-8 pt-5">
        {activeTab === 'open' ? (
          openPosts.length ? (
            openPosts.map((request) => (
              <ServiceRequestCard
                key={request.id}
                request={request}
                quoteCount={serviceQuotes.filter((quote) => quote.requestId === request.id).length}
                onPress={() => handlePostPress(request)}
              />
            ))
          ) : (
            <EmptyState
              icon={<MessageSquareQuote size={28} color={colors.brand700} />}
              title="Nenhum post aberto"
              description="Publique uma solicitação pela opção Comunidade na tela inicial."
            />
          )
        ) : proposals.length ? (
          proposals.map((quote) => {
            const provider = providers.find((item) => item.id === quote.providerId);
            const request = myPosts.find((item) => item.id === quote.requestId);
            return (
              <View key={quote.id} className="mb-4 rounded-3xl border border-slate-100 bg-white p-5">
                <Text className="text-[10px] font-black uppercase tracking-wide text-brand-700" numberOfLines={1}>
                  {request?.title}
                </Text>
                <View className="mt-3 flex-row items-center gap-3">
                  <Image
                    source={{ uri: provider?.avatarUrl }}
                    className="h-14 w-14 rounded-2xl bg-slate-200"
                  />
                  <View className="min-w-0 flex-1">
                    <Text className="text-base font-black text-slate-950" numberOfLines={1}>
                      {quote.providerName}
                    </Text>
                    <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
                      {provider?.profession ?? 'Profissional parceiro'}
                    </Text>
                    <View className="mt-1 flex-row items-center gap-1">
                      <Star size={13} color="#FBBF24" fill="#FBBF24" />
                      <Text className="text-xs font-bold text-slate-600">
                        {provider?.rating ?? 'Novo'}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-lg font-black text-emerald-700">
                    {formatCurrency(quote.amount)}
                  </Text>
                </View>
                <View className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <Text className="text-sm leading-6 text-slate-600">{quote.message}</Text>
                </View>
                <View className="mt-4">
                  <Button
                    label="Abrir Chat"
                    icon={<MessageCircle size={18} color={colors.white} />}
                    onPress={() => setChatQuote(quote)}
                  />
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState
            icon={<MessageCircle size={28} color={colors.brand700} />}
            title="Nenhuma proposta recebida"
            description="Quando um profissional demonstrar interesse, a proposta aparecerá aqui."
          />
        )}
      </ScrollView>
      <CommunityPostDetailsModal
        post={selectedOwnPost}
        quoteCount={
          selectedOwnPost
            ? serviceQuotes.filter((quote) => quote.requestId === selectedOwnPost.id).length
            : 0
        }
        onClose={() => setSelectedOwnPost(null)}
      />
    </Screen>
  );
}

function ButtonTab({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <View className="flex-1">
      <Button
        label={`${label} (${count})`}
        variant={selected ? 'primary' : 'ghost'}
        onPress={onPress}
      />
    </View>
  );
}
